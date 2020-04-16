# tedious-helper
Simple promise-based utility for tedious to make queries easier

## Installation
```
npm install --save @pitschbr/tedious-helper
```

## How to use
There are 3 main methods exposed:
- execSP(cfg, query, params)
- execSQL(cfg, query, params)
- execSQLBatch(cfg, query)

and some helpers
- merge(params, values, options)
- TYPES

### Basic
```javascript
// require the module
const tds = require('@pitschbr/tedious-helper');
const TYPES = tds.TYPES; // this a copy of tedious types

// create a db api

exports.deleteUser = o => {
  const cs = {}; // your tedious options
  const query = 'delete from users where accountid = @AccountID and username = @UserName';
  const params = {
    'AccountID': { type: TYPES.Int, required: true },
    'UserName': { type: TYPES.VarChar, required: true },
  };

  return tdsHelper.execSQL(cs, query, tdsHelper.merge(params, o));
};

exports.runAddObject = function (o) {
  const cs = { }; // all your connection options
  const query = 'dbo.spAddObject';
  const params = {
    'Name': { type: TYPES.VarChar, required: true },
    'TypeID': { type: TYPES.Int },
  };

  return tdsHelper.execSP(cs, query, tdsHelper.merge(params, o));
};
```

If used the parameter description object holds all the parameters for the sql.
Each property is the parameter name, and the value is description of that parameter.
Parameter names are case-insensitive!
```js
{
  type: tedious.TYPES.VarChar, // the type of parameter
  alt: ['id', 'userid'], // alternate incoming names when matching values in merge
  required: !!boolean, // throws if true and parameter is not given
  options: { length: 50 }, // tedious param options if needed
  value: 1, // the value of parameter
}
```

if you use merge, you can merge the parameter type with another object that has parameter values given by property names.

### Output parameters and return values
You can get output parameters and return values by keeping a reference to the parameters you passed in. The 'value' will be filled in with the appropriate value.

