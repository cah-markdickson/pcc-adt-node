// --------------------------------------------------------------------------
// test/adt_soap-test.js
// --------------------------------------------------------------------------

var expect = require('chai').expect;
var soap   = require('soap');

//--------------------------------------------------------------------------

var base64        = require('../lib/base64');
var hl7           = require('../lib/hl7');
var ADTSoapServer = require('../lib/adt_soap');

//--------------------------------------------------------------------------

var soapOptions = {
    // uncomment to enable console logging
    // log: console.log,
    wsdl: 'test/fixtures/local-adt.wsdl'
};
var soapUrl = 'http://127.0.0.1:8001/soap/adt?wsdl';
var soapServer = null;

describe('ADT SOAP Functions', function() {
    describe('listen()', function() {
        var hl7String =
            "MSH|^~\\&|SNDAPPL|snd_fac|RECAPPL|rec_fac|20070208165451.447- 0500||ADT^A03|110A35A09B785|P|2.5\r" +
            "EVN|A03|200702080406|||PointClickCare|200702080406\r" +
            "PID|1||99269^^^^FI~123321^^^^PI||Berk^Ailsa||19400503|F|||579 5 PointClickCare Street^^Lakeview^OH^90210||^PRN^PH^^^^^^^^^(937) 8432794|||||04254|275-32-9550\r" +
            "PV1|1|N|100^104^A^ABC2PREV0021^^N^100^1||||G45670 ^Haenel^Mary- Ann|||||||||||0||||||||||||||||||||||||||20070207 0403-0500|200702080406-0500\r" +
            "ZEV|2001|200702080406|PointClickCare";

        before(function() {
            soapServer = new ADTSoapServer();
            soapServer.listen(soapOptions);
        });

        after(function(done) {
            soapServer.close(done);
        });

        it('should be callable via SOAP client in happy path', function(done) {
            var args = {
                username: 'default-user',
                password: 'default-password',
                data: base64.encode(hl7String)
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    hl7.parseString(base64.decode(result.data), function(err, parsedMsa) {
                        expect(err).to.be.null;
                        var newmsh = hl7.getSegmentOfType('MSH', parsedMsa);
                        expect(newmsh.parsed.ReceivingApplication).to.equal('SNDAPPL');
                        expect(newmsh.parsed.ReceivingFacility).to.equal('snd_fac');
                        expect(newmsh.parsed.SendingApplication).to.equal('RECAPPL');
                        expect(newmsh.parsed.SendingFacility).to.equal('rec_fac');
                        expect(newmsh.parsed.MessageControlID).to.equal('110A35A09B785');
                        expect(newmsh.parsed.ProcessingID).to.equal('P');

                        var msa = hl7.getSegmentOfType('MSA', parsedMsa);
                        expect(msa.parsed.ControlID).to.equal('110A35A09B785');
                        expect(msa.parsed.AcknowledgementCode).to.equal('AA');

                        expect(hl7.getSegmentOfType('ERR', parsedMsa)).to.be.null;
                        done();
                    });
                });
            });
        });

        it('should SOAP fault if missing data argument', function(done) {
            var args = {
                username: 'default-user',
                password: 'default-password'
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.not.be.null;
                    done();
                });
            });
        });

        it('should SOAP fault if data argument is bogus', function(done) {
            var args = {
                username: 'default-user',
                password: 'default-password',
                data: '***bogus***'
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.not.be.null;
                    done();
                });
            });
        });

        it('should return AE on missing username', function(done) {
            var args = {
                password: 'default-password',
                data: base64.encode(hl7String)
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    hl7.parseString(base64.decode(result.data), function(err, parsedMsa) {
                        expect(err).to.be.null;

                        var msa = hl7.getSegmentOfType('MSA', parsedMsa);
                        expect(msa.parsed.ControlID).to.equal('110A35A09B785');
                        expect(msa.parsed.AcknowledgementCode).to.equal('AE');

                        var errSegment = hl7.getSegmentOfType('ERR', parsedMsa);
                        expect(errSegment).to.not.be.null;
                        expect(errSegment.parsed.ErrorCode).to.equal('AE');
                        expect(errSegment.parsed.UserMessage).to.equal('Missing required argument "username"');
                        done();
                    });
                });
            });
        });

        it('should return AE on missing password', function(done) {
            var args = {
                username: 'default-user',
                data: base64.encode(hl7String)
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    hl7.parseString(base64.decode(result.data), function(err, parsedMsa) {
                        expect(err).to.be.null;

                        var msa = hl7.getSegmentOfType('MSA', parsedMsa);
                        expect(msa.parsed.ControlID).to.equal('110A35A09B785');
                        expect(msa.parsed.AcknowledgementCode).to.equal('AE');

                        var errSegment = hl7.getSegmentOfType('ERR', parsedMsa);
                        expect(errSegment).to.not.be.null;
                        expect(errSegment.parsed.ErrorCode).to.equal('AE');
                        expect(errSegment.parsed.UserMessage).to.equal('Missing required argument "password"');
                        done();
                    });
                });
            });
        });

        it('should return AE on bogus credentials', function(done) {
            var args = {
                username: 'fail',
                password: 'fail',
                data: base64.encode(hl7String)
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    hl7.parseString(base64.decode(result.data), function(err, parsedMsa) {
                        expect(err).to.be.null;

                        var msa = hl7.getSegmentOfType('MSA', parsedMsa);
                        expect(msa.parsed.ControlID).to.equal('110A35A09B785');
                        expect(msa.parsed.AcknowledgementCode).to.equal('AE');

                        var errSegment = hl7.getSegmentOfType('ERR', parsedMsa);
                        expect(errSegment).to.not.be.null;
                        expect(errSegment.parsed.ErrorCode).to.equal('AE');
                        expect(errSegment.parsed.UserMessage).to.equal('Invalid credentials');
                        done();
                    });
                });
            });
        });

        it('should return AE on invalid PCC HL7 message', function(done) {
            // Missing PID segment, invalid according to PCC
            var badHL7String =
                "MSH|^~\\&|SNDAPPL|snd_fac|RECAPPL|rec_fac|20070208165451.447- 0500||ADT^A03|110A35A09B785|P|2.5\r" +
                "EVN|A03|200702080406|||PointClickCare|200702080406\r" +
                "PV1|1|N|100^104^A^ABC2PREV0021^^N^100^1||||G45670 ^Haenel^Mary- Ann|||||||||||0||||||||||||||||||||||||||20070207 0403-0500|200702080406-0500\r" +
                "ZEV|2001|200702080406|PointClickCare";
            var args = {
                username: 'default-user',
                password: 'default-password',
                data: base64.encode(badHL7String)
            };
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    hl7.parseString(base64.decode(result.data), function(err, parsedMsa) {
                        expect(err).to.be.null;

                        var msa = hl7.getSegmentOfType('MSA', parsedMsa);
                        expect(msa.parsed.ControlID).to.equal('110A35A09B785');
                        expect(msa.parsed.AcknowledgementCode).to.equal('AE');

                        var errSegment = hl7.getSegmentOfType('ERR', parsedMsa);
                        expect(errSegment).to.not.be.null;
                        expect(errSegment.parsed.ErrorCode).to.equal('AE');
                        expect(errSegment.parsed.UserMessage).to.equal('Incoming "A03" message malfomed, did not have expected one "PID" segment');
                        done();
                    });
                });
            });
        });
    });

    describe('handler()', function() {
        var hl7String =
            "MSH|^~\\&|SNDAPPL|snd_fac|RECAPPL|rec_fac|20070208165451.447- 0500||ADT^A03|110A35A09B785|P|2.5\r" +
            "EVN|A03|200702080406|||PointClickCare|200702080406\r" +
            "PID|1||99269^^^^FI~123321^^^^PI||Berk^Ailsa||19400503|F|||579 5 PointClickCare Street^^Lakeview^OH^90210||^PRN^PH^^^^^^^^^(937) 8432794|||||04254|275-32-9550\r" +
            "PV1|1|N|100^104^A^ABC2PREV0021^^N^100^1||||G45670 ^Haenel^Mary- Ann|||||||||||0||||||||||||||||||||||||||20070207 0403-0500|200702080406-0500\r" +
            "ZEV|2001|200702080406|PointClickCare";

        before(function() {
            soapServer = new ADTSoapServer();
            soapServer.listen(soapOptions);
        });

        after(function(done) {
            soapServer.close(done);
        });

        it('should pass through to correct registered handler', function(done) {
            var handlerWasCalled = false;
            var args = {
                username: 'default-user',
                password: 'default-password',
                data: base64.encode(hl7String)
            };
            soapServer.handler('A03', function(message, next) {
                expect(message).to.not.be.null;
                var evn = hl7.getSegmentOfType('EVN', message);
                expect(evn.parsed.TypeCode).to.equal('A03');
                handlerWasCalled = true;
                next();
            });
            soap.createClient(soapUrl, function(err, client) {
                expect(err).to.be.null;
                client.SubmitMessage(args, function(err, result) {
                    expect(err).to.be.null;
                    expect(result.data).to.not.be.null;
                    expect(handlerWasCalled).to.be.true;
                    done();
                });
            });
        });
    });
});