const { vmpSign } = require('./evs-sign.cjs')
exports.default = async (context) => vmpSign(context, 'afterSign')
