/**
 * @module
 * @name WtQueryBuilder
 * @author Nicolò Zanardi
 * @description this builder works as a context for the query/search strategy
 */
/*jshint node: true */
/*jshint esnext: true */
"use strict";

//let WtJSONBQueryStrategy = require("../../lib/query/WtQueryStrategies.js").WtJSONBQueryStrategy;

/**
 * @class
 * @name WtQueryBuilder
 */
class WtQueryBuilder {

    /**
     * @constructor
     * @param{WtQueryStrategy} strategy
     */

    constructor(strategy) {
    //     if (!strategy) {
    //         strategy = new WtJSONBQueryStrategy();
    //     }
    //     this.strategy = strategy;
    // }
    //
    // get strategy() {
    //     return this._strategy;
    // }
    //
    // set strategy(strategy) {
    //     if (strategy) {
    //         this._strategy = strategy;
    //     }
    }

    /**
     * @method
     * @name compose
     * @description compose a query given a JSON query object
     * @param{Object} queryParams - a valid query object
     */
     compose(queryArgs) {
         return global.sails.model.queryArgs.Model.find({type: queryArgs.idDataType});
     }

}

module.exports = WtQueryBuilder;
