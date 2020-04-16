const tdsHelper = require('@pitschbr/tedious-helper');
const TYPES = tdsHelper.TYPES; // just a copy of tedious.TYPES

// run a predefined stored proc
exports.runAddObject = function (o) {
  const cs = { }; // all your connection options
  const query = 'dbo.spAddObject';
  const params = {
    'Name': { type: TYPES.VarChar, required: true },
    'TypeID': { type: TYPES.Int },
  };

  return tdsHelper.execSP(cs, query, tdsHelper.merge(params, o));
};
