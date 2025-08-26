// backend/utils/Transaction.js
const MpesaRequest = require('./MpesaRequest');
const config = require('../config/mpesaConfig');

class Transaction {
  constructor(apiKey, publicKey, environment = 'sandbox') {
    this.apiKey = apiKey;
    this.publicKey = publicKey;
    this.env = environment;
    // escolhe host conforme ambiente
    this.baseHost = (environment === 'production' || config.env === 'live') ? 'api.vm.co.mz' : 'api.sandbox.vm.co.mz';
    // porta 18352 usada no exemplo para C2B singleStage
    this.baseUrl = `https://${this.baseHost}:18352`;
    this.request = new MpesaRequest(apiKey, publicKey);
  }

  async c2b(data) {
    // data: { value, client_number, agent_id, transaction_reference, third_party_reference }
    const url = `${this.baseUrl}/ipg/v1x/c2bPayment/singleStage/`;
    const params = {
      input_Amount: data.value,
      input_CustomerMSISDN: data.client_number,
      input_ServiceProviderCode: data.agent_id,
      input_TransactionReference: data.transaction_reference,
      input_ThirdPartyReference: data.third_party_reference,
    };
    const resp = await this.request.post(url, params);
    return resp;
  }

  // outros métodos (b2c, b2b, status, reversal) podem ser adicionados depois
}

module.exports = Transaction;
