/**
 * @module
 * @name recursiveQueries
 * @author Nicolò Zanardi
 */
/* jshint esnext: true */
/* jshint node: true */
"use strict";


/**
 * @method
 * @name fetchDataTypeTree
 * @param{integer} root - ID (?) of the root Data Type
 */
function fetchDataTypeTree(root, next) {

    let res = [];

    return next(null, res);

}

/**
 * @method
 * @name fetchSubjectDataTree
 * @description fetch a nested (recursive) data structure for the given subject
 * @param{integer} subjectId
 */
function fetchSubjectDataTree(subjectId, next) {

    let res = [];

    return next(null, res);

}

/**
 * @method
 * @name fetchSubjectDataTreeSimple
 * @description fetch a single level data structure with all the children for the given subject
 * @param{integer} subjectId
 */
function fetchSubjectDataTreeSimple(subjectId, next) {

    let res = [];

    return next(null, res);

}

module.exports.fetchDataTypeTree = fetchDataTypeTree;
module.exports.fetchSubjectDataTree = fetchSubjectDataTree;
module.exports.fetchSubjectDataTreeSimple = fetchSubjectDataTreeSimple;
