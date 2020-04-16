const debug = require('debug')('tediousHelper');
const _ = require('lodash');
const tedious = require('tedious');
const Connection = tedious.Connection;
const Request = tedious.Request;
const TYPES = tedious.TYPES;

exports.TYPES = TYPES;

const ReturnTypes = {
  Table: 1,
  JSON: 2,
  XML: 3,
};

// Merge parameter definitions with values
// params: { <paramName>: { value: [value], type: <tedious.TYPES>, (alt: [prop1, ...], options: {...}) }, ... }
// values: { <paramName>: value, ... }
// options: { (throw: bool }
exports.merge = function merge(params, values, options) {
  debug('tediousHelper.merge');
  // params is an object
  if (params && !Array.isArray(params)) {
    _.map(params, (def, name) => {
      // all the possible parameter names into one array
      const alts = _.isString(def.alt) ? [def.alt, def.alt.toLowerCase()]
        : Array.isArray(def.alt) ? def.alt.concat(def.alt.map(n => n.toLowerCase()))
          : def.alt;
      const found = _.flatten([name, name.toLowerCase(), alts])
        .some(function (prop) {
          const has = _.has(values, prop);
          if (has && values[prop] !== undefined)
            def.value = values[prop];
          return has;
        });

      if (!found && def.required && _.get(options, 'throw')) {
        debug('Missing required parameter ' + name);
        throw new Error('Missing required parameter ' + name);
      }
    });
  }
  return params;
};

function addParams(request, params) {
  debug('addParams');
  if (params) {
    _.map(params, (param, name) => {
      debug(name + ' (' + param.type.name + ' - ' + (typeof param.value) + '): ' + param.value);
      if (_.has(param, 'value') || param.output) {
        const addFn = (param.output) ? request.addOutputParameter : request.addParameter;
        if (param.type === TYPES.DateTime && _.isString(param.value))
          addFn.call(request, name, param.type, new Date(Date.parse(param.value)), param.options);
        else {
          addFn.call(request, name, param.type, param.value, param.options);
          debug('Added ' + name + ' ' + param.value);
        }
      }
      else if (param.required)
        throw new Error('Missing required parameter: ' + name);
    });
  }
}

// creates a connection to db
function connect(cfg) {
  return new Promise((resolve, reject) => {
    const conn = new Connection(cfg);
    conn.on('connect', function (err) {
      if (err) {
        debug(err);
        return reject(err);
      }
      return resolve(conn);
    });
  });
}

function exec(fn, cfg, query, params) {
  let conn = null;

  const p = new Promise((resolve, reject) => {
    let rs = [];
    let returnType = ReturnTypes.Table; // could be json or xml
    let clearOnNextRow = false; // whether then next row should clear rs

    connect(cfg)
      .then(function (cxn) {
        conn = cxn;
        conn.on('error', function (err) {
          debug(err);
          return reject(err);
        });

        let request = new Request(query, function (err, rowCount, rows) {
          debug('exec finished');
          conn.close();
          if (err) {
            debug(err);
            return reject(err);
          }
          return resolve(rs);
        });

        request.on('columnMetadata', function (cols) {
          const colNames = Object.getOwnPropertyNames(cols);
          if (colNames.length === 1 && cols[colNames].colName.toLowerCase().startsWith('json_'))
            returnType = ReturnTypes.JSON;
        });

        request.on('row', function (cols) {
          //debug('exec row event');
          let row = {};
          if (clearOnNextRow) {
            rs = [];
            clearOnNextRow = false;
          }

          if (returnType === ReturnTypes.JSON) {
            const [col] = Object.getOwnPropertyNames(cols);
            rs = JSON.parse(cols[col].value);
          }
          else {
            _.forEach(cols, col => {
              row[col.metadata.colName] = col.value;
            });
            rs.push(row);
          }
        });

        request.on('returnValue', function (paramName, value, meta) {
          // figure how to expose return values
          if (params && _.has(params, paramName))
            params[paramName].value = value;
        });

        // more is true no matter what it seems
        request.on('doneInProc', function (rowCount, more, rows) {
          debug('exec doneInProc event ' + rowCount + ' ' + more + ' ' + rs.length);
          if (more)
            clearOnNextRow = true;
          //p.notify({ event: 'doneInProc', rows: rs });
        });

        request.on('doneProc', function (rowCount, more, returnValue, rows) {
          debug('exec doneProc event ' + rowCount + ' ' + more + ' ' + rs.length);
          // figure how to expose returnValue
          if (params)
            params['returnValue'] = { value: returnValue };
          if (more)
            clearOnNextRow = true;
          //p.notify({ event: 'doneProc', rows: rs });
        });

        request.on('done', function (rowCount, more, rows) {
          debug('exec done event ' + rowCount + ' ' + more);
          if (more)
            clearOnNextRow = true;
          //p.notify({ event: 'done', rows: rs });
        });

        addParams(request, params);
        debug('request', request);

        fn.call(conn, request);
      })
      .catch(err => {
        debug(err);
        // make sure to close connection
        if (conn) conn.close();
        return reject(err);
      });

  })
    .finally(() => {
      // make sure the connection closes
      if (conn) conn.close();
    });

  return p;
}

exports.execSP = function (cfg, query, params) {
  debug('tediousHelper.execSP ' + query);
  return exec(tedious.Connection.prototype.callProcedure, cfg, query, params);
};

exports.execSQL = function (cfg, query, params) {
  debug('tediousHelper.execSql ' + query);
  return exec(tedious.Connection.prototype.execSql, cfg, query, params);
};

exports.execSQLBatch = function (cfg, query) {
  debug('tediousHelper.execSqlBatch ' + query);
  return exec(tedious.Connection.prototype.execSqlBatch, cfg, query, null);
};
