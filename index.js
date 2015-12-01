/* jshint esnext: true */
/* jshint node: true */
"use strict";

let WtCrudManager = require('./lib/crud/WtCrudManager');
let WtQueryBuilder = require('./lib/query/WtQueryBuilder');
module.exports.CrudManager = WtCrudManager;
module.exports.QueryBuilder = WtQueryBuilder;
