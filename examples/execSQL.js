const tdsHelper = require('@pitschbr/tedious-helper');
const TYPES = tdsHelper.TYPES; // just a copy of tedious.TYPES

// run some arbitrary sql
exports.deleteUser = o => {
  const cs = {}; // your tedious options
  const query = 'delete from users where accountid = @AccountID and username = @UserName';
  const params = {
    'AccountID': { type: TYPES.Int, required: true },
    'UserName': { type: TYPES.VarChar, required: true },
  };

  return tdsHelper.execSQL(cs, query, tdsHelper.merge(params, o));
};
