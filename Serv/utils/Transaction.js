// backend/utils/Transaction.js
const MpesaRequest = require('./MpesaRequest');
const config = require('../config/mpesaConfig');

class Transaction {
  constructor(apiKey, publicKey, environment = 'sandbox') {
    this.apiKey = apiKey;
    this.publicKey = publicKey;
    this.env = environment || config.env || 'sandbox';

    // escolhe host conforme ambiente (sandbox vs production)
    this.baseHost = (this.env === 'production' || this.env === 'live') ? 'api.vm.co.mz' : 'api.sandbox.vm.co.mz';

    // Note: portas diferentes para endpoints diferentes (conforme documentação)
    this.c2bPort    = process.env.MPESA_C2B_PORT || '18352';
    this.statusPort = process.env.MPESA_STATUS_PORT || '18353';
    // cria request helper (axios com timeout & bearer)
    this.request = new MpesaRequest(apiKey, publicKey);
  }

  // c2b single stage
  async c2b(data) {
    const url = `https://${this.baseHost}:${this.c2bPort}/ipg/v1x/c2bPayment/singleStage/`;
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

  // query transaction status (probe)
  async status({ transaction_id, third_party_reference, agent_id }) {
    const url = `https://${this.baseHost}:${this.statusPort}/ipg/v1x/queryTransactionStatus/`;
    const params = {
      input_QueryReference: transaction_id || third_party_reference,
      input_ThirdPartyReference: third_party_reference,
      input_ServiceProviderCode: agent_id || config.serviceProviderCode
    };
    const resp = await this.request.get(url, params);
    return resp;
  }

  // Expor outros endpoints se necessário (b2c, b2b, reversal) - podem ser adicionados mais tarde.
}

module.exports = Transaction;
