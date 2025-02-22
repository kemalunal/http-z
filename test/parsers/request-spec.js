const _ = require('lodash')
const sinon = require('sinon')
const should = require('should')
const nassert = require('n-assert')
const HttpZConsts = require('../../src/consts')
const HttpZError = require('../../src/error')
const RequestParser = require('../../src/parsers/request')

describe('parsers / request', () => {
  function getParserInstance(rawMessage, opts = {}) {
    return new RequestParser(rawMessage, opts)
  }

  describe('static parse', () => {
    beforeEach(() => {
      sinon.stub(RequestParser.prototype, 'parse')
    })

    afterEach(() => {
      RequestParser.prototype.parse.restore()
    })

    it('should create instance of RequestParser and call instance.parse', () => {
      let params = 'raw'
      let expected = 'ok'

      RequestParser.prototype.parse.returns('ok')

      let actual = RequestParser.parse(params)
      nassert.assert(actual, expected)

      nassert.assertFn({ inst: RequestParser.prototype, fnName: 'parse', expectedArgs: '_without-args_' })
    })
  })

  describe('parse', () => {
    it('should call related methods and return request model', () => {
      let parser = getParserInstance('rawRequest')
      sinon.stub(parser, '_parseMessageForRows')
      sinon.stub(parser, '_parseHostRow')
      sinon.stub(parser, '_parseStartRow')
      sinon.stub(parser, '_parseHeaderRows')
      sinon.stub(parser, '_parseCookiesRow')
      sinon.stub(parser, '_parseBodyRows')
      sinon.stub(parser, '_generateModel').returns('requestModel')

      let expected = 'requestModel'
      let actual = parser.parse()
      should(actual).eql(expected)

      nassert.assertFn({ inst: parser, fnName: '_parseMessageForRows', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_parseHostRow', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_parseStartRow', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_parseHeaderRows', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_parseCookiesRow', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_parseBodyRows', expectedArgs: '_without-args_' })
      nassert.assertFn({ inst: parser, fnName: '_generateModel', expectedArgs: '_without-args_' })
    })
  })

  describe('_parseMessageForRows', () => {
    it('should parse message for rows when message is without Cookie and Body rows', () => {
      let rawRequest = ['start-line', 'host: somehost', 'header1', 'header2', 'header3', '', ''].join(HttpZConsts.EOL)

      let parser = getParserInstance(rawRequest)
      parser._parseMessageForRows()

      should(parser.startRow).eql('start-line')
      should(parser.hostRow).eql('host: somehost')
      should(parser.headerRows).eql(['host: somehost', 'header1', 'header2', 'header3'])
      should(parser.cookiesRow).eql(undefined)
      should(parser.bodyRows).eql('')
    })

    it('should parse message for rows when message contains Cookies row', () => {
      let rawRequest = [
        'start-line',
        'host: somehost',
        'header1',
        'header2',
        'header3',
        'cookie: somecookies',
        '',
        ''
      ].join(HttpZConsts.EOL)

      let parser = getParserInstance(rawRequest)
      parser._parseMessageForRows()

      should(parser.startRow).eql('start-line')
      should(parser.hostRow).eql('host: somehost')
      should(parser.headerRows).eql(['host: somehost', 'header1', 'header2', 'header3', 'cookie: somecookies'])
      should(parser.cookiesRow).eql('cookie: somecookies')
      should(parser.bodyRows).eql('')
    })

    it('should parse message for rows when message contains Body rows', () => {
      let rawRequest = ['start-line', 'host: somehost', 'header1', 'header2', 'header3', '', 'body'].join(
        HttpZConsts.EOL
      )

      let parser = getParserInstance(rawRequest)
      parser._parseMessageForRows()

      should(parser.startRow).eql('start-line')
      should(parser.hostRow).eql('host: somehost')
      should(parser.headerRows).eql(['host: somehost', 'header1', 'header2', 'header3'])
      should(parser.cookiesRow).eql(undefined)
      should(parser.bodyRows).eql('body')
    })
  })

  describe('_parseHostRow', () => {
    it('should throw error when opts.mandatoryHost is true and hostRow is nil or empty', () => {
      const ERR = {
        message: 'host header is required'
      }
      let parser = getParserInstance('HTTP Request Message', { mandatoryHost: true })

      parser.hostRow = undefined
      should(parser._parseHostRow.bind(parser)).throw(HttpZError, ERR)
      parser.hostRow = null
      should(parser._parseHostRow.bind(parser)).throw(HttpZError, ERR)
      parser.hostRow = ''
      should(parser._parseHostRow.bind(parser)).throw(HttpZError, {
        message: 'host header must be not empty string'
      })
      parser.hostRow = 'Host: '
      should(parser._parseHostRow.bind(parser)).throw(HttpZError, {
        message: 'host header value must be not empty string'
      })
    })

    it('should not throw error when opts.mandatoryHost is false and hostRow is nil or empty', () => {
      let parser = getParserInstance('HTTP Request Message', { mandatoryHost: false })

      parser.hostRow = undefined
      parser._parseHostRow()
      parser.hostRow = null
      parser._parseHostRow()
      parser.hostRow = ''
      parser._parseHostRow()
      parser.hostRow = 'Host: '
      parser._parseHostRow()
    })

    it('should set instance.host when host header value is present', () => {
      let parser = getParserInstance()
      parser.hostRow = 'Host: www.example.com:2345'
      let expected = 'www.example.com:2345'

      parser._parseHostRow()
      should(parser.host).eql(expected)
    })
  })

  describe('_parseStartRow', () => {
    function test({ startRow, expected }) {
      let parser = getParserInstance()
      parser.startRow = startRow
      parser.host = 'example.com'

      parser._parseStartRow()
      should(parser.method).eql(expected.method)
      should(parser.protocolVersion).eql(expected.protocolVersion)
      should(parser.target).eql(expected.target)
      should(parser.host).eql(expected.host)
      should(parser.path).eql(expected.path)
      should(parser.params).eql(expected.params)
    }

    function getDefaultExpected(ex) {
      let def = {
        method: 'GET',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: []
      }
      return _.extend(def, ex)
    }

    it('should throw error when startRow has invalid format', () => {
      let parser = getParserInstance()
      parser.startRow = 'Invalid request startRow'

      should(parser._parseStartRow.bind(parser)).throw(HttpZError, {
        message: 'Incorrect startRow format, expected: Method request-target HTTP-Version',
        details: 'Invalid request startRow'
      })
    })

    it('should parse valid startRow when method is GET', () => {
      let startRow = 'GET /features HTTP/1.1'
      let expected = getDefaultExpected()

      test({ startRow, expected })
    })

    it('should parse valid startRow when method is DELETE', () => {
      let startRow = 'DELETE /features HTTP/1.1'
      let expected = getDefaultExpected({
        method: 'DELETE'
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when HTTP protocol is v2.0', () => {
      let startRow = 'GET /features HTTP/2.0'
      let expected = getDefaultExpected({
        protocolVersion: 'HTTP/2.0'
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when target is a root path', () => {
      let startRow = 'GET / HTTP/1.1'
      let expected = getDefaultExpected({
        target: '/',
        path: '/'
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when target is in absolute-form', () => {
      let startRow = 'GET https://foo.com/users HTTP/1.1'
      let expected = getDefaultExpected({
        target: 'https://foo.com/users',
        host: 'example.com',
        path: '/users'
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when query params with two simple parameters', () => {
      let startRow = 'GET /features?p1=v1&p2%3E=v2%3B HTTP/1.1'
      let expected = getDefaultExpected({
        target: '/features?p1=v1&p2%3E=v2%3B',
        queryParams: [
          { name: 'p1', value: 'v1' },
          { name: 'p2>', value: 'v2;' }
        ]
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when query params with object parameters', () => {
      let startRow = 'GET /features?p1[x]=v1&p1[y]=v2&p23E=v3%3B HTTP/1.1'
      let expected = getDefaultExpected({
        target: '/features?p1[x]=v1&p1[y]=v2&p23E=v3%3B',
        queryParams: [
          { name: 'p1[x]', value: 'v1' },
          { name: 'p1[y]', value: 'v2' },
          { name: 'p2>', value: 'v3;' }
        ]
      })

      test({ startRow, expected })
    })

    it('should parse valid startRow when query params with array parameters', () => {
      let startRow = 'GET /features?p1[]=v1&p1[]=v2&p2%3E=v3%3B HTTP/1.1'
      let expected = getDefaultExpected({
        target: '/features?p1[]=v1&p1[]=v2&p2%3E=v3%3B',
        queryParams: [
          { name: 'p1[x]', value: 'v1' },
          { name: 'p1[y]', value: 'v2' },
          { name: 'p2>', value: 'v3;' }
        ]
      })

      test({ startRow, expected })
    })
  })

  describe('_parseCookiesRow', () => {
    it('should throw error when cookiesRow has invalid format', () => {
      let parser = getParserInstance()
      parser.cookiesRow = 'Cookie values'

      should(parser._parseCookiesRow.bind(parser)).throw(HttpZError, {
        message: 'Incorrect cookie row format, expected: Cookie: Name1=Value1;...',
        details: 'Cookie values'
      })
    })

    it('should throw error when cookiesRow has values with invalid format', () => {
      let parser = getParserInstance()
      parser.cookiesRow = 'Cookie: csrftoken=123abc;=val'

      should(parser._parseCookiesRow.bind(parser)).throw(HttpZError, {
        message: 'Incorrect cookie pair format, expected: Name1=Value1;...',
        details: 'csrftoken=123abc;=val'
      })
    })

    it('should set instance.cookies to undefined when cookiesRow is undefined', () => {
      let parser = getParserInstance()
      parser.cookiesRow = undefined
      let expected

      parser._parseCookiesRow()
      should(parser.cookies).eql(expected)
    })

    it('should set instance.cookies to [] when cookiesRow does not contain values', () => {
      let parser = getParserInstance()
      parser.cookiesRow = 'Cookie:'
      let expected = []

      parser._parseCookiesRow()
      should(parser.cookies).eql(expected)
    })

    it('should set instance.cookies when cookiesRow is valid and not empty', () => {
      let parser = getParserInstance()
      parser.cookiesRow = 'Cookie: csrftoken=123abc;sessionid=456def;username='
      let expected = [
        { name: 'csrftoken', value: '123abc' },
        { name: 'sessionid', value: '456def' },
        { name: 'username' }
      ]

      parser._parseCookiesRow()
      should(parser.cookies).eql(expected)
    })
  })

  describe('_generateModel', () => {
    it('should generate request model using instance fields when some fields are undefined', () => {
      let parser = getParserInstance()
      parser.headersSize = 25
      parser.bodySize = 0
      parser.method = 'method'
      parser.protocolVersion = 'protocolVersion'
      parser.target = 'target'
      parser.path = 'path'
      parser.host = 'host'

      let expected = {
        method: 'method',
        protocolVersion: 'protocolVersion',
        target: 'target',
        path: 'path',
        host: 'host',
        headersSize: 25,
        bodySize: 0
      }
      let actual = parser._generateModel()
      should(actual).eql(expected)
    })

    it('should generate request model using instance fields', () => {
      let parser = getParserInstance()
      parser.headersSize = 55
      parser.bodySize = 4
      parser.method = 'method'
      parser.protocolVersion = 'protocolVersion'
      parser.target = 'target'
      parser.path = 'path'
      parser.host = 'host'
      parser.queryParams = 'queryParams'
      parser.headers = 'headers'
      parser.cookies = 'cookies'
      parser.body = 'body'

      let expected = {
        method: 'method',
        protocolVersion: 'protocolVersion',
        target: 'target',
        path: 'path',
        host: 'host',
        queryParams: 'queryParams',
        headers: 'headers',
        cookies: 'cookies',
        body: 'body',
        headersSize: 55,
        bodySize: 4
      }
      let actual = parser._generateModel()
      should(actual).eql(expected)
    })
  })

  describe('functional tests', () => {
    it('should parse request without headers and body', () => {
      let rawRequest = ['GET /features?p1=v1%3B&p2= HTTP/1.1', 'host: www.example.com', '', ''].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'GET',
        protocolVersion: 'HTTP/1.1',
        target: '/features?p1=v1%3B&p2=',
        host: 'www.example.com',
        path: '/features',
        queryParams: [
          { name: 'p1', value: 'v1;' },
          { name: 'p2', value: '' }
        ],
        headers: [{ name: 'host', value: 'www.example.com' }],
        headersSize: 62,
        bodySize: 0
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request without body (header names in lower case)', () => {
      let rawRequest = [
        'GET https://foo.com/bar HTTP/1.1',
        'host: example.com',
        'connection: ',
        'accept: */*',
        'accept-Encoding: gzip,deflate',
        'accept-language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0',
        'generated-by: "modern-framework 2020"',
        'Sec-ch-ua: "Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
        'Authorization: AWS4-HMAC-SHA256 Credential=CRED/20210118/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-acl;x-amz-user-agent, Signature=fb1e6017a1d',
        '',
        ''
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'GET',
        protocolVersion: 'HTTP/1.1',
        target: 'https://foo.com/bar',
        host: 'example.com',
        path: '/bar',
        queryParams: [],
        headers: [
          {
            name: 'host',
            value: 'example.com'
          },
          {
            name: 'connection',
            value: ''
          },
          {
            name: 'accept',
            value: '*/*'
          },
          {
            name: 'accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'accept-language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'user-agent',
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0'
          },
          {
            name: 'generated-by',
            value: 'modern-framework 2020'
          },
          {
            name: 'Sec-ch-ua',
            value: '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"'
          },
          {
            name: 'Authorization',
            value:
              'AWS4-HMAC-SHA256 Credential=CRED/20210118/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-acl;x-amz-user-agent, Signature=fb1e6017a1d'
          }
        ],
        headersSize: 529,
        bodySize: 0
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with cookies and without body', () => {
      let rawRequest = [
        'GET /features HTTP/1.1',
        'Host: example.com:8080',
        'Connection: ',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cookie: csrftoken=123abc;sessionid=sd=456def%3B;userid=',
        '',
        ''
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'GET',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com:8080',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com:8080'
          },
          {
            name: 'Connection',
            value: ''
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Cookie',
            value: 'csrftoken=123abc;sessionid=sd=456def%3B;userid='
          }
        ],
        cookies: [
          { name: 'csrftoken', value: '123abc' },
          { name: 'sessionid', value: 'sd=456def%3B' },
          { name: 'userid' }
        ],
        headersSize: 219,
        bodySize: 0
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with body of contentType=text/plain', () => {
      let rawRequest = [
        'POST /features HTTP/1.1',
        'Host: example.com',
        'Connection: keep-alive',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Encoding: gzip,deflate',
        'Content-Length: 301',
        '',
        'Text data'
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'POST',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com'
          },
          {
            name: 'Connection',
            value: 'keep-alive'
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Content-Type',
            value: 'text/plain; charset=UTF-8'
          },
          {
            name: 'Content-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Content-Length',
            value: '301'
          }
        ],
        body: {
          contentType: 'text/plain',
          text: 'Text data'
        },
        headersSize: 262,
        bodySize: 9
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with body of contentType=application/x-www-form-urlencoded', () => {
      let rawRequest = [
        'POST /features HTTP/1.1',
        'Host: example.com',
        'Connection: keep-alive',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Encoding: gzip,deflate',
        'Content-Length: 301',
        '',
        'firstName=John&lastName=&age=25%3B'
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'POST',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com'
          },
          {
            name: 'Connection',
            value: 'keep-alive'
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Content-Type',
            value: 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          {
            name: 'Content-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Content-Length',
            value: '301'
          }
        ],
        body: {
          contentType: 'application/x-www-form-urlencoded',
          params: [
            { name: 'firstName', value: 'John' },
            { name: 'lastName', value: '' },
            { name: 'age', value: '25;' }
          ]
        },
        headersSize: 285,
        bodySize: 34
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with body of contentType=multipart/form-data', () => {
      let rawRequest = [
        'POST /features HTTP/1.1',
        'Host: example.com',
        'Connection: keep-alive',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Content-Type: multipart/form-data; boundary="111362:53119209"',
        'Content-Encoding: gzip,deflate',
        'Content-Length: 301',
        '',
        '--111362:53119209',
        'Content-Disposition: form-data; name="user.data[firstName]"',
        '',
        'John',
        '--111362:53119209',
        'Content-Disposition: form-data; name="photo"; filename="photo1.jpg"',
        'Content-Type: application/octet-stream',
        '',
        '<binary-data>',
        '--111362:53119209',
        'Content-Disposition: form-data; name="bio"',
        'Content-Type: text/plain',
        '',
        'some info',
        'more info',
        '',
        '--111362:53119209--'
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'POST',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com'
          },
          {
            name: 'Connection',
            value: 'keep-alive'
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Content-Type',
            value: 'multipart/form-data; boundary="111362:53119209"'
          },
          {
            name: 'Content-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Content-Length',
            value: '301'
          }
        ],
        body: {
          contentType: 'multipart/form-data',
          boundary: '111362:53119209',
          params: [
            { name: 'user.data[firstName]', value: 'John' },
            {
              contentType: 'application/octet-stream',
              name: 'photo',
              fileName: 'photo1.jpg',
              value: '<binary-data>'
            },
            {
              contentType: 'text/plain',
              name: 'bio',
              value: 'some info\r\nmore info\r\n'
            }
          ]
        },
        headersSize: 284,
        bodySize: 367
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with body of contentType=multipart/alternative (inline)', () => {
      let rawRequest = [
        'POST /features HTTP/1.1',
        'Host: example.com',
        'Connection: keep-alive',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Content-Type: multipart/alternative; boundary="111362-53119209"',
        'Content-Encoding: gzip,deflate',
        'Content-Length: 301',
        '',
        '--111362-53119209',
        'Content-Disposition: inline',
        '',
        '<base64-data>',
        '--111362-53119209--'
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'POST',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com'
          },
          {
            name: 'Connection',
            value: 'keep-alive'
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Content-Type',
            value: 'multipart/alternative; boundary="111362-53119209"'
          },
          {
            name: 'Content-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Content-Length',
            value: '301'
          }
        ],
        body: {
          contentType: 'multipart/alternative',
          boundary: '111362-53119209',
          params: [
            {
              type: 'inline',
              value: '<base64-data>'
            }
          ]
        },
        headersSize: 286,
        bodySize: 84
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })

    it('should parse request with body of contentType=multipart/mixed (attachment)', () => {
      let rawRequest = [
        'POST /features HTTP/1.1',
        'Host: example.com',
        'Connection: keep-alive',
        'Accept: */*',
        'Accept-Encoding: gzip,deflate',
        'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Content-Type: multipart/mixed; boundary="11136253119209"',
        'Content-Encoding: gzip,deflate',
        'Content-Length: 301',
        '',
        '--11136253119209',
        'Content-Disposition: attachment; filename="photo1.jpg"',
        'Content-Type: application/octet-stream',
        '',
        '<binary-data>',
        '--11136253119209--'
      ].join(HttpZConsts.EOL)

      let requestModel = {
        method: 'POST',
        protocolVersion: 'HTTP/1.1',
        target: '/features',
        host: 'example.com',
        path: '/features',
        queryParams: [],
        headers: [
          {
            name: 'Host',
            value: 'example.com'
          },
          {
            name: 'Connection',
            value: 'keep-alive'
          },
          {
            name: 'Accept',
            value: '*/*'
          },
          {
            name: 'Accept-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Accept-Language',
            value: 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'
          },
          {
            name: 'Content-Type',
            value: 'multipart/mixed; boundary="11136253119209"'
          },
          {
            name: 'Content-Encoding',
            value: 'gzip,deflate'
          },
          {
            name: 'Content-Length',
            value: '301'
          }
        ],
        body: {
          contentType: 'multipart/mixed',
          boundary: '11136253119209',
          params: [
            {
              type: 'attachment',
              contentType: 'application/octet-stream',
              fileName: 'photo1.jpg',
              value: '<binary-data>'
            }
          ]
        },
        headersSize: 279,
        bodySize: 149
      }

      let parser = getParserInstance(rawRequest)
      let actual = parser.parse()
      should(actual).eql(requestModel)
    })
  })
})
