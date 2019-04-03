'use strict';

const should = require('should');
const utils  = require('../src/utils');

describe('utils', () => {
  describe('splitIntoTwoParts', () => {
    const delimiter = ' ';

    it('should return empty array when str is nil or empty', () => {
      let actual = utils.splitIntoTwoParts(undefined, delimiter);
      should(actual).eql([]);

      actual = utils.splitIntoTwoParts(null, delimiter);
      should(actual).eql([]);

      actual = utils.splitIntoTwoParts('', delimiter);
      should(actual).eql([]);
    });

    it('should return empty array when str does not contain delimiter', () => {
      let actual = utils.splitIntoTwoParts('somestring', delimiter);
      should(actual).eql([]);

      actual = utils.splitIntoTwoParts('1234567890', delimiter);
      should(actual).eql([]);
    });

    it('should return empty array with one empty element when str does not contain two parts', () => {
      let actual = utils.splitIntoTwoParts('somestring    ', delimiter);
      should(actual).eql(['somestring', '']);

      actual = utils.splitIntoTwoParts('    somestring', delimiter);
      should(actual).eql(['', 'somestring']);
    });

    it('should return array of two elems when str contains two parts', () => {
      let actual = utils.splitIntoTwoParts('partOne partTwo', delimiter);
      should(actual).eql(['partOne', 'partTwo']);

      actual = utils.splitIntoTwoParts('partOne    partTwo   ', delimiter);
      should(actual).eql(['partOne', 'partTwo']);

      actual = utils.splitIntoTwoParts('partOne partTwo partThree', delimiter);
      should(actual).eql(['partOne', 'partTwo partThree']);
    });
  });

  describe('generateUrl', () => {
    function test(params, expected) {
      let actual = utils.generateUrl(params);
      should(actual).eql(expected);
    }

    it('should generate url', () => {
      test({
        protocol: 'http',
        host: 'example.com',
        path: '/features'
      }, 'http://example.com/features');
    });

    it('should generate url with basic auth', () => {
      test({
        protocol: 'http',
        host: 'example.com',
        path: '/features',
        basicAuth: {
          username: 'smith',
          password: 12345
        }
      }, 'http://smith:12345@example.com/features');
    });

    it('should generate url with params', () => {
      test({
        protocol: 'http',
        host: 'example.com',
        path: '/features',
        params: {
          p1: 'v1',
          p2: null
        }
      }, 'http://example.com/features?p1=v1&p2=null');
    });
  });

  describe('getHeaderName', () => {
    function test(name, expected) {
      let actual = utils.getHeaderName(name);
      should(actual).eql(expected);
    }

    it('should return empty string when name is null', () => {
      test(null, '');
    });

    it('should return name as is when it does not contain elements', () => {
      test('Cookie', 'Cookie');
    });

    it('should return capitalized name when it does not contain elements', () => {
      test('cookie', 'Cookie');
    });

    it('should return capitalized name when it contain two elements', () => {
      test('set-cookie', 'Set-Cookie');
    });

    it('should return capitalized name when it contain three elements', () => {
      test('x-Server-version', 'X-Server-Version');
    });
  });
});
