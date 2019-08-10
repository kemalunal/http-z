'use strict';

const sinon          = require('sinon');
const should         = require('should');
const nassert        = require('n-assert');
const HttpZError     = require('../../src/error');
const parser         = require('../../src/parsers');
const RequestParser  = require('../../src/parsers/request');
const ResponseParser = require('../../src/parsers/response');

describe('parsers / index', () => {
  beforeEach(() => {
    sinon.stub(RequestParser, 'parse');
    sinon.stub(ResponseParser, 'parse');
  });

  afterEach(() => {
    RequestParser.parse.restore();
    ResponseParser.parse.restore();
  });

  it('should throw error when function called without params', () => {
    should(parser.bind(null)).throw(HttpZError, {
      message: 'plainMessage is required'
    });
  });

  it('should throw error when plainMessage is nil', () => {
    let params = [null];

    should(parser.bind(null, ...params)).throw(HttpZError, {
      message: 'plainMessage is required'
    });
  });

  it('should throw error when plainMessage has unknown format', () => {
    let params = ['invalid'];

    should(parser.bind(null, ...params)).throw(HttpZError, {
      message: 'Unknown plainMessage format'
    });
  });

  it('should call RequestParser.parse when plainMessage is request (eol is \n)', () => {
    let plainMessage = [
      'get /features http/1.1',
      'host: example.com',
      ''
    ].join('\n');
    let expected = 'parsed-request';
    let expectedMultipleArgs = [plainMessage, '\n'];

    RequestParser.parse.returns('parsed-request');

    let actual = parser(plainMessage);
    should(actual).eql(expected);

    nassert.assertFn({ inst: RequestParser, fnName: 'parse', expectedMultipleArgs });
    nassert.assertFn({ inst: ResponseParser, fnName: 'parse' });
  });

  it('should call ResponseParser.parse when plainMessage is response (eol is \r\n)', () => {
    let plainMessage = [
      'http/1.1 200 Ok',
      'host: example.com',
      ''
    ].join('\r\n');
    let expected = 'parsed-response';
    let expectedMultipleArgs = [plainMessage, '\r\n'];

    ResponseParser.parse.returns('parsed-response');

    let actual = parser(plainMessage);
    should(actual).eql(expected);

    nassert.assertFn({ inst: RequestParser, fnName: 'parse' });
    nassert.assertFn({ inst: ResponseParser, fnName: 'parse', expectedMultipleArgs });
  });
});
