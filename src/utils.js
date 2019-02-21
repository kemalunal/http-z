'use strict';

const _ = require('lodash');

exports.splitIntoTwoParts = (str, delimiter) => {
  if (_.isEmpty(str)) {
    return [];
  }

  let delimiterIndex = str.indexOf(delimiter);
  if (delimiterIndex === -1) {
    return [];
  }

  let res = [str.slice(0, delimiterIndex), str.slice(delimiterIndex + delimiter.length)];
  res[0] = _.trim(res[0], ' ');
  res[1] = _.trim(res[1], ' ');

  return res;
};

// TODO: test it
exports.validateNotEmptyString = (str, name) => {
  if (!str || !_.isString(str)) {
    throw exports.getErrorMessage(`${name} must be not empty string`);
  }
};

// TODO: test it
exports.validateNotZeroNumber = (num, name) => {
  if (!num || !_.isNumber(num) || num < 0) {
    throw exports.getErrorMessage(`${name} must be not zero, positive number`);
  }
};

// TODO: test it
exports.getErrorMessage = (msg, data) => {
  if (data) {
    msg += `. Data: ${data}`;
  }

  let err = new Error(msg);
  err.type = 'HttpZ Error';
  return err;
};

exports.getHeaderName = (name) => {
  return _.chain(name)
    .split('-')
    .map(_.capitalize)
    .join('-')
    .value();
};
