#include <SoftwareSerial.h>
#include <EEPROM.h>

// ── Pinos SIM7600 ──
#define SIM_RX_PIN 10
#define SIM_TX_PIN 11
SoftwareSerial simSerial(SIM_RX_PIN, SIM_TX_PIN);

// ── Sensor de fluxo + tamper ──
const int PIN_FLOW   = 2;
const int PIN_TAMPER = 3;

volatile uint32_t flowPulses = 0;
volatile bool    tamperAlert = false;

// ── Persistência EEPROM ──
// 0–3: totalPulses, 4–7: lastSentPulses
const int EE_ADDR_TOTAL    = 0;
const int EE_ADDR_LASTSEND = 4;
uint32_t totalPulses    = 0;
uint32_t lastSentPulses = 0;

// ── Envio automático ──
unsigned long lastAuto      = 0;
unsigned long AUTO_INTERVAL = 60UL * 1000UL;

// ── Configuráveis via Serial ──
String APN           = "internet";
String MEDIDOR_ID    = "000000000000000000000000";
String DEVICE_TOKEN  = "TOKEN_DO_DISPOSITIVO";
String SMS_NUMBER    = "+258850580193";

// ── Protótipos ──
void onFlowPulse();
void onTamper();
void initModem();
bool sendAT(const String &cmd, unsigned long timeout=2000);
bool performHttpPost(float consumo, uint32_t delta);
void reportData();
void processSerial();
uint32_t eepromRead32(int addr);
void eepromWrite32(int addr, uint32_t val);

// ── Setup ──
void setup() {
  Serial.begin(115200);
  while(!Serial) delay(10);
  Serial.println("\n=== Telemetria com Retry Persistente ===");

  // Carrega EEPROM
  totalPulses    = eepromRead32(EE_ADDR_TOTAL);
  lastSentPulses = eepromRead32(EE_ADDR_LASTSEND);
  Serial.printf("EEPROM: total=%lu, lastSent=%lu\n", totalPulses, lastSentPulses);

  // Interrupções e pinos
  pinMode(PIN_FLOW, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW), onFlowPulse, FALLING);
  pinMode(PIN_TAMPER, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_TAMPER), onTamper, FALLING);

  // Inicia modem
  simSerial.begin(9600);
  initModem();
  Serial.println("Setup concluído. Digite 'help'.");
}

// ── Loop ──
void loop() {
  if (millis() - lastAuto >= AUTO_INTERVAL) {
    lastAuto = millis();
    reportData();
  }
  processSerial();
}

// ── Interrupções ──
void onFlowPulse()  { flowPulses++; totalPulses++; }
void onTamper()     { tamperAlert = true; }

// ── EEPROM util ──
uint32_t eepromRead32(int addr) {
  uint32_t v=0;
  for(int i=0;i<4;i++) v |= (uint32_t)EEPROM.read(addr+i) << (8*i);
  return v;
}
void eepromWrite32(int addr, uint32_t val){
  for(int i=0;i<4;i++) EEPROM.write(addr+i, (val>>(8*i)) & 0xFF);
  EEPROM.commit();
}

// ── Inicializa SIM7600 ──
void initModem(){
  sendAT("AT"); sendAT("AT+CFUN=1"); sendAT("AT+CPIN?");
  sendAT("AT+CGATT=1");
  sendAT("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  sendAT("AT+SAPBR=3,1,\"APN\",\""+APN+"\"");
  sendAT("AT+SAPBR=1,1"); sendAT("AT+HTTPINIT");
}

// ── Envia AT e espera OK ──
bool sendAT(const String &cmd, unsigned long timeout){
  simSerial.println(cmd);
  Serial.print("> "); Serial.println(cmd);
  unsigned long t0=millis();
  while(millis()-t0<timeout){
    if(simSerial.find("OK")){
      Serial.println("< OK"); return true;
    }
  }
  Serial.println("< TIMEOUT"); return false;
}

// ── Realiza HTTP POST e devolve true se 200 OK ──
bool performHttpPost(float consumo, uint32_t delta){
//Introduzir o link do backend
  String url = "http://api.teu-servidor.com/api/leituras";
  sendAT("AT+HTTPPARA=\"CID\",1");
  sendAT("AT+HTTPPARA=\"URL\",\""+url+"\"");
  String hdr="Content-Type: application/json\\r\\nAuthorization: DeviceToken "+DEVICE_TOKEN;
  sendAT("AT+HTTPPARA=\"HEADER\",\""+hdr+"\"");

  // Payload com delta e total opcional
  String payload="{";
  payload+="\"medidorId\":\""+MEDIDOR_ID+"\",";
  payload+="\"consumoDiario\":"+String(consumo,3)+",";
  payload+="\"pulsosEnviados\":"+String(delta)+",";
  payload+="\"totalPulsos\":"+String(totalPulses);
  payload+="}";

  simSerial.print("AT+HTTPDATA=");
  simSerial.print(payload.length());
  simSerial.println(",10000");
  delay(200);
  simSerial.print(payload);
  delay(200);

  simSerial.println("AT+HTTPACTION=1");
  // aguarda e lê resposta
  String resp = simSerial.readStringUntil('\n');
  Serial.println("[HTTPACTION] "+resp);
  // procura ",200,"
  if(resp.indexOf(",200,")>=0) return true;
  return false;
}

// ── Reporta dados ou acumula se falhar ──
void reportData(){
  noInterrupts();
  uint32_t pulses = flowPulses;
  bool tamper = tamperAlert;
  flowPulses=0; tamperAlert=false;
  interrupts();

  uint32_t delta = totalPulses - lastSentPulses;
  float consumo = delta * 0.1 / 1000.0;

  Serial.printf("\n[REPORT] delta=%u, consumo=%.3f\n", delta, consumo);

  // SMS de tamper imediata
  if(tamper){
    sendAT("AT+CMGF=1");
    simSerial.print("AT+CMGS=\""+SMS_NUMBER+"\"\r");
    simSerial.print("Tamper no medidor "+MEDIDOR_ID); simSerial.write(0x1A);
    delay(5000);
  }

  // Só tenta HTTP se delta>0
  if(delta>0){
    if(performHttpPost(consumo, delta)){
      Serial.println("[REPORT] enviado com sucesso.");
      lastSentPulses = totalPulses;
      eepromWrite32(EE_ADDR_LASTSEND, lastSentPulses);
      eepromWrite32(EE_ADDR_TOTAL, totalPulses);
    } else {
      Serial.println("[REPORT] falha no envio, manterá delta na próxima.");
      eepromWrite32(EE_ADDR_TOTAL, totalPulses);
    }
  } else {
    Serial.println("[REPORT] sem novos pulsos, nada a enviar.");
  }
}

// ── Processa comandos via Serial USB ──
void processSerial(){
  if(!Serial.available()) return;
  String cmd=Serial.readStringUntil('\n'); cmd.trim();
  if(cmd=="help"){
    Serial.println("apn:<valor> medidor:<id> token:<tk>");
    Serial.println("sms:<num> interval:<s> send");
    return;
  }
  if(cmd.startsWith("apn:")){ APN=cmd.substring(4); initModem(); return; }
  if(cmd.startsWith("medidor:")){ MEDIDOR_ID=cmd.substring(8); return;}
  if(cmd.startsWith("token:")){ DEVICE_TOKEN=cmd.substring(6); return;}
  if(cmd.startsWith("sms:")){ SMS_NUMBER=cmd.substring(4); return;}
  if(cmd.startsWith("interval:")){
    long s=cmd.substring(9).toInt(); if(s>0) AUTO_INTERVAL=s*1000UL;
    return;
  }
  if(cmd=="send"){ reportData(); return; }
  Serial.println("Desconhecido. 'help'");
}
