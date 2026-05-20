/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function(global, factory) { /* global define, require, module */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobufjs/minimal"], factory);

    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/minimal"));

})(this, function($protobuf) {
    "use strict";

    // Common aliases
    var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
    
    // Exported root namespace
    var $root = $protobuf.roots.logstore || ($protobuf.roots.logstore = {});
    
    $root.exonum = (function() {
    
        /**
         * Namespace exonum.
         * @exports exonum
         * @namespace
         */
        var exonum = {};
    
        exonum.examples = (function() {
    
            /**
             * Namespace examples.
             * @memberof exonum
             * @namespace
             */
            var examples = {};
    
            examples.logstore = (function() {
    
                /**
                 * Namespace logstore.
                 * @memberof exonum.examples
                 * @namespace
                 */
                var logstore = {};
    
                logstore.log_service = (function() {
    
                    /**
                     * Namespace log_service.
                     * @memberof exonum.examples.logstore
                     * @namespace
                     */
                    var log_service = {};
    
                    log_service.WriteLog = (function() {
    
                        /**
                         * Properties of a WriteLog.
                         * @memberof exonum.examples.logstore.log_service
                         * @interface IWriteLog
                         * @property {string|null} [content_hash] WriteLog content_hash
                         * @property {string|null} [level] WriteLog level
                         * @property {string|null} [source] WriteLog source
                         * @property {string|null} [message_preview] WriteLog message_preview
                         * @property {number|Long|null} [seed] WriteLog seed
                         * @property {string|null} [message] WriteLog message
                         * @property {string|null} [metadata_json] WriteLog metadata_json
                         */
    
                        /**
                         * Constructs a new WriteLog.
                         * @memberof exonum.examples.logstore.log_service
                         * @classdesc Represents a WriteLog.
                         * @implements IWriteLog
                         * @constructor
                         * @param {exonum.examples.logstore.log_service.IWriteLog=} [properties] Properties to set
                         */
                        function WriteLog(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * WriteLog content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.content_hash = "";
    
                        /**
                         * WriteLog level.
                         * @member {string} level
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.level = "";
    
                        /**
                         * WriteLog source.
                         * @member {string} source
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.source = "";
    
                        /**
                         * WriteLog message_preview.
                         * @member {string} message_preview
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.message_preview = "";
    
                        /**
                         * WriteLog seed.
                         * @member {number|Long} seed
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.seed = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * WriteLog message.
                         * @member {string} message
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.message = "";
    
                        /**
                         * WriteLog metadata_json.
                         * @member {string} metadata_json
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         */
                        WriteLog.prototype.metadata_json = "";
    
                        /**
                         * Creates a new WriteLog instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {exonum.examples.logstore.log_service.IWriteLog=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.log_service.WriteLog} WriteLog instance
                         */
                        WriteLog.create = function create(properties) {
                            return new WriteLog(properties);
                        };
    
                        /**
                         * Encodes the specified WriteLog message. Does not implicitly {@link exonum.examples.logstore.log_service.WriteLog.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {exonum.examples.logstore.log_service.IWriteLog} message WriteLog message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteLog.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                                writer.uint32(/* id 2, wireType 2 =*/18).string(message.level);
                            if (message.source != null && Object.hasOwnProperty.call(message, "source"))
                                writer.uint32(/* id 3, wireType 2 =*/26).string(message.source);
                            if (message.message_preview != null && Object.hasOwnProperty.call(message, "message_preview"))
                                writer.uint32(/* id 4, wireType 2 =*/34).string(message.message_preview);
                            if (message.seed != null && Object.hasOwnProperty.call(message, "seed"))
                                writer.uint32(/* id 5, wireType 0 =*/40).uint64(message.seed);
                            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                                writer.uint32(/* id 6, wireType 2 =*/50).string(message.message);
                            if (message.metadata_json != null && Object.hasOwnProperty.call(message, "metadata_json"))
                                writer.uint32(/* id 7, wireType 2 =*/58).string(message.metadata_json);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified WriteLog message, length delimited. Does not implicitly {@link exonum.examples.logstore.log_service.WriteLog.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {exonum.examples.logstore.log_service.IWriteLog} message WriteLog message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteLog.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a WriteLog message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.log_service.WriteLog} WriteLog
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteLog.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.log_service.WriteLog();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.level = reader.string();
                                    break;
                                case 3:
                                    message.source = reader.string();
                                    break;
                                case 4:
                                    message.message_preview = reader.string();
                                    break;
                                case 5:
                                    message.seed = reader.uint64();
                                    break;
                                case 6:
                                    message.message = reader.string();
                                    break;
                                case 7:
                                    message.metadata_json = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a WriteLog message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.log_service.WriteLog} WriteLog
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteLog.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a WriteLog message.
                         * @function verify
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        WriteLog.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.level != null && message.hasOwnProperty("level"))
                                if (!$util.isString(message.level))
                                    return "level: string expected";
                            if (message.source != null && message.hasOwnProperty("source"))
                                if (!$util.isString(message.source))
                                    return "source: string expected";
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                if (!$util.isString(message.message_preview))
                                    return "message_preview: string expected";
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (!$util.isInteger(message.seed) && !(message.seed && $util.isInteger(message.seed.low) && $util.isInteger(message.seed.high)))
                                    return "seed: integer|Long expected";
                            if (message.message != null && message.hasOwnProperty("message"))
                                if (!$util.isString(message.message))
                                    return "message: string expected";
                            if (message.metadata_json != null && message.hasOwnProperty("metadata_json"))
                                if (!$util.isString(message.metadata_json))
                                    return "metadata_json: string expected";
                            return null;
                        };
    
                        /**
                         * Creates a WriteLog message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.log_service.WriteLog} WriteLog
                         */
                        WriteLog.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.log_service.WriteLog)
                                return object;
                            var message = new $root.exonum.examples.logstore.log_service.WriteLog();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.level != null)
                                message.level = String(object.level);
                            if (object.source != null)
                                message.source = String(object.source);
                            if (object.message_preview != null)
                                message.message_preview = String(object.message_preview);
                            if (object.seed != null)
                                if ($util.Long)
                                    (message.seed = $util.Long.fromValue(object.seed)).unsigned = true;
                                else if (typeof object.seed === "string")
                                    message.seed = parseInt(object.seed, 10);
                                else if (typeof object.seed === "number")
                                    message.seed = object.seed;
                                else if (typeof object.seed === "object")
                                    message.seed = new $util.LongBits(object.seed.low >>> 0, object.seed.high >>> 0).toNumber(true);
                            if (object.message != null)
                                message.message = String(object.message);
                            if (object.metadata_json != null)
                                message.metadata_json = String(object.metadata_json);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a WriteLog message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @static
                         * @param {exonum.examples.logstore.log_service.WriteLog} message WriteLog
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        WriteLog.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                object.level = "";
                                object.source = "";
                                object.message_preview = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.seed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.seed = options.longs === String ? "0" : 0;
                                object.message = "";
                                object.metadata_json = "";
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.level != null && message.hasOwnProperty("level"))
                                object.level = message.level;
                            if (message.source != null && message.hasOwnProperty("source"))
                                object.source = message.source;
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                object.message_preview = message.message_preview;
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (typeof message.seed === "number")
                                    object.seed = options.longs === String ? String(message.seed) : message.seed;
                                else
                                    object.seed = options.longs === String ? $util.Long.prototype.toString.call(message.seed) : options.longs === Number ? new $util.LongBits(message.seed.low >>> 0, message.seed.high >>> 0).toNumber(true) : message.seed;
                            if (message.message != null && message.hasOwnProperty("message"))
                                object.message = message.message;
                            if (message.metadata_json != null && message.hasOwnProperty("metadata_json"))
                                object.metadata_json = message.metadata_json;
                            return object;
                        };
    
                        /**
                         * Converts this WriteLog to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.log_service.WriteLog
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        WriteLog.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return WriteLog;
                    })();
    
                    log_service.LogRecord = (function() {
    
                        /**
                         * Properties of a LogRecord.
                         * @memberof exonum.examples.logstore.log_service
                         * @interface ILogRecord
                         * @property {string|null} [content_hash] LogRecord content_hash
                         * @property {string|null} [level] LogRecord level
                         * @property {string|null} [source] LogRecord source
                         * @property {string|null} [message_preview] LogRecord message_preview
                         * @property {number|Long|null} [history_len] LogRecord history_len
                         * @property {exonum.crypto.IHash|null} [history_hash] LogRecord history_hash
                         * @property {string|null} [message] LogRecord message
                         * @property {string|null} [metadata_json] LogRecord metadata_json
                         * @property {string|null} [tx_hash] LogRecord tx_hash
                         */
    
                        /**
                         * Constructs a new LogRecord.
                         * @memberof exonum.examples.logstore.log_service
                         * @classdesc Represents a LogRecord.
                         * @implements ILogRecord
                         * @constructor
                         * @param {exonum.examples.logstore.log_service.ILogRecord=} [properties] Properties to set
                         */
                        function LogRecord(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * LogRecord content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.content_hash = "";
    
                        /**
                         * LogRecord level.
                         * @member {string} level
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.level = "";
    
                        /**
                         * LogRecord source.
                         * @member {string} source
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.source = "";
    
                        /**
                         * LogRecord message_preview.
                         * @member {string} message_preview
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.message_preview = "";
    
                        /**
                         * LogRecord history_len.
                         * @member {number|Long} history_len
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.history_len = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * LogRecord history_hash.
                         * @member {exonum.crypto.IHash|null|undefined} history_hash
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.history_hash = null;
    
                        /**
                         * LogRecord message.
                         * @member {string} message
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.message = "";
    
                        /**
                         * LogRecord metadata_json.
                         * @member {string} metadata_json
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.metadata_json = "";
    
                        /**
                         * LogRecord tx_hash.
                         * @member {string} tx_hash
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         */
                        LogRecord.prototype.tx_hash = "";
    
                        /**
                         * Creates a new LogRecord instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {exonum.examples.logstore.log_service.ILogRecord=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.log_service.LogRecord} LogRecord instance
                         */
                        LogRecord.create = function create(properties) {
                            return new LogRecord(properties);
                        };
    
                        /**
                         * Encodes the specified LogRecord message. Does not implicitly {@link exonum.examples.logstore.log_service.LogRecord.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {exonum.examples.logstore.log_service.ILogRecord} message LogRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        LogRecord.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                                writer.uint32(/* id 2, wireType 2 =*/18).string(message.level);
                            if (message.source != null && Object.hasOwnProperty.call(message, "source"))
                                writer.uint32(/* id 3, wireType 2 =*/26).string(message.source);
                            if (message.message_preview != null && Object.hasOwnProperty.call(message, "message_preview"))
                                writer.uint32(/* id 4, wireType 2 =*/34).string(message.message_preview);
                            if (message.history_len != null && Object.hasOwnProperty.call(message, "history_len"))
                                writer.uint32(/* id 5, wireType 0 =*/40).uint64(message.history_len);
                            if (message.history_hash != null && Object.hasOwnProperty.call(message, "history_hash"))
                                $root.exonum.crypto.Hash.encode(message.history_hash, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                                writer.uint32(/* id 7, wireType 2 =*/58).string(message.message);
                            if (message.metadata_json != null && Object.hasOwnProperty.call(message, "metadata_json"))
                                writer.uint32(/* id 8, wireType 2 =*/66).string(message.metadata_json);
                            if (message.tx_hash != null && Object.hasOwnProperty.call(message, "tx_hash"))
                                writer.uint32(/* id 9, wireType 2 =*/74).string(message.tx_hash);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified LogRecord message, length delimited. Does not implicitly {@link exonum.examples.logstore.log_service.LogRecord.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {exonum.examples.logstore.log_service.ILogRecord} message LogRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        LogRecord.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a LogRecord message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.log_service.LogRecord} LogRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        LogRecord.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.log_service.LogRecord();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.level = reader.string();
                                    break;
                                case 3:
                                    message.source = reader.string();
                                    break;
                                case 4:
                                    message.message_preview = reader.string();
                                    break;
                                case 5:
                                    message.history_len = reader.uint64();
                                    break;
                                case 6:
                                    message.history_hash = $root.exonum.crypto.Hash.decode(reader, reader.uint32());
                                    break;
                                case 7:
                                    message.message = reader.string();
                                    break;
                                case 8:
                                    message.metadata_json = reader.string();
                                    break;
                                case 9:
                                    message.tx_hash = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a LogRecord message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.log_service.LogRecord} LogRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        LogRecord.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a LogRecord message.
                         * @function verify
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        LogRecord.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.level != null && message.hasOwnProperty("level"))
                                if (!$util.isString(message.level))
                                    return "level: string expected";
                            if (message.source != null && message.hasOwnProperty("source"))
                                if (!$util.isString(message.source))
                                    return "source: string expected";
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                if (!$util.isString(message.message_preview))
                                    return "message_preview: string expected";
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (!$util.isInteger(message.history_len) && !(message.history_len && $util.isInteger(message.history_len.low) && $util.isInteger(message.history_len.high)))
                                    return "history_len: integer|Long expected";
                            if (message.history_hash != null && message.hasOwnProperty("history_hash")) {
                                var error = $root.exonum.crypto.Hash.verify(message.history_hash);
                                if (error)
                                    return "history_hash." + error;
                            }
                            if (message.message != null && message.hasOwnProperty("message"))
                                if (!$util.isString(message.message))
                                    return "message: string expected";
                            if (message.metadata_json != null && message.hasOwnProperty("metadata_json"))
                                if (!$util.isString(message.metadata_json))
                                    return "metadata_json: string expected";
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                if (!$util.isString(message.tx_hash))
                                    return "tx_hash: string expected";
                            return null;
                        };
    
                        /**
                         * Creates a LogRecord message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.log_service.LogRecord} LogRecord
                         */
                        LogRecord.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.log_service.LogRecord)
                                return object;
                            var message = new $root.exonum.examples.logstore.log_service.LogRecord();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.level != null)
                                message.level = String(object.level);
                            if (object.source != null)
                                message.source = String(object.source);
                            if (object.message_preview != null)
                                message.message_preview = String(object.message_preview);
                            if (object.history_len != null)
                                if ($util.Long)
                                    (message.history_len = $util.Long.fromValue(object.history_len)).unsigned = true;
                                else if (typeof object.history_len === "string")
                                    message.history_len = parseInt(object.history_len, 10);
                                else if (typeof object.history_len === "number")
                                    message.history_len = object.history_len;
                                else if (typeof object.history_len === "object")
                                    message.history_len = new $util.LongBits(object.history_len.low >>> 0, object.history_len.high >>> 0).toNumber(true);
                            if (object.history_hash != null) {
                                if (typeof object.history_hash !== "object")
                                    throw TypeError(".exonum.examples.logstore.log_service.LogRecord.history_hash: object expected");
                                message.history_hash = $root.exonum.crypto.Hash.fromObject(object.history_hash);
                            }
                            if (object.message != null)
                                message.message = String(object.message);
                            if (object.metadata_json != null)
                                message.metadata_json = String(object.metadata_json);
                            if (object.tx_hash != null)
                                message.tx_hash = String(object.tx_hash);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a LogRecord message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @static
                         * @param {exonum.examples.logstore.log_service.LogRecord} message LogRecord
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        LogRecord.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                object.level = "";
                                object.source = "";
                                object.message_preview = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.history_len = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.history_len = options.longs === String ? "0" : 0;
                                object.history_hash = null;
                                object.message = "";
                                object.metadata_json = "";
                                object.tx_hash = "";
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.level != null && message.hasOwnProperty("level"))
                                object.level = message.level;
                            if (message.source != null && message.hasOwnProperty("source"))
                                object.source = message.source;
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                object.message_preview = message.message_preview;
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (typeof message.history_len === "number")
                                    object.history_len = options.longs === String ? String(message.history_len) : message.history_len;
                                else
                                    object.history_len = options.longs === String ? $util.Long.prototype.toString.call(message.history_len) : options.longs === Number ? new $util.LongBits(message.history_len.low >>> 0, message.history_len.high >>> 0).toNumber(true) : message.history_len;
                            if (message.history_hash != null && message.hasOwnProperty("history_hash"))
                                object.history_hash = $root.exonum.crypto.Hash.toObject(message.history_hash, options);
                            if (message.message != null && message.hasOwnProperty("message"))
                                object.message = message.message;
                            if (message.metadata_json != null && message.hasOwnProperty("metadata_json"))
                                object.metadata_json = message.metadata_json;
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                object.tx_hash = message.tx_hash;
                            return object;
                        };
    
                        /**
                         * Converts this LogRecord to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.log_service.LogRecord
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        LogRecord.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return LogRecord;
                    })();
    
                    return log_service;
                })();
    
                logstore.hash_service = (function() {
    
                    /**
                     * Namespace hash_service.
                     * @memberof exonum.examples.logstore
                     * @namespace
                     */
                    var hash_service = {};
    
                    hash_service.WriteHash = (function() {
    
                        /**
                         * Properties of a WriteHash.
                         * @memberof exonum.examples.logstore.hash_service
                         * @interface IWriteHash
                         * @property {string|null} [content_hash] WriteHash content_hash
                         * @property {string|null} [level] WriteHash level
                         * @property {string|null} [message_preview] WriteHash message_preview
                         * @property {number|Long|null} [seed] WriteHash seed
                         */
    
                        /**
                         * Constructs a new WriteHash.
                         * @memberof exonum.examples.logstore.hash_service
                         * @classdesc Represents a WriteHash.
                         * @implements IWriteHash
                         * @constructor
                         * @param {exonum.examples.logstore.hash_service.IWriteHash=} [properties] Properties to set
                         */
                        function WriteHash(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * WriteHash content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @instance
                         */
                        WriteHash.prototype.content_hash = "";
    
                        /**
                         * WriteHash level.
                         * @member {string} level
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @instance
                         */
                        WriteHash.prototype.level = "";
    
                        /**
                         * WriteHash message_preview.
                         * @member {string} message_preview
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @instance
                         */
                        WriteHash.prototype.message_preview = "";
    
                        /**
                         * WriteHash seed.
                         * @member {number|Long} seed
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @instance
                         */
                        WriteHash.prototype.seed = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * Creates a new WriteHash instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IWriteHash=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.hash_service.WriteHash} WriteHash instance
                         */
                        WriteHash.create = function create(properties) {
                            return new WriteHash(properties);
                        };
    
                        /**
                         * Encodes the specified WriteHash message. Does not implicitly {@link exonum.examples.logstore.hash_service.WriteHash.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IWriteHash} message WriteHash message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteHash.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                                writer.uint32(/* id 2, wireType 2 =*/18).string(message.level);
                            if (message.message_preview != null && Object.hasOwnProperty.call(message, "message_preview"))
                                writer.uint32(/* id 3, wireType 2 =*/26).string(message.message_preview);
                            if (message.seed != null && Object.hasOwnProperty.call(message, "seed"))
                                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.seed);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified WriteHash message, length delimited. Does not implicitly {@link exonum.examples.logstore.hash_service.WriteHash.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IWriteHash} message WriteHash message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteHash.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a WriteHash message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.hash_service.WriteHash} WriteHash
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteHash.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.hash_service.WriteHash();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.level = reader.string();
                                    break;
                                case 3:
                                    message.message_preview = reader.string();
                                    break;
                                case 4:
                                    message.seed = reader.uint64();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a WriteHash message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.hash_service.WriteHash} WriteHash
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteHash.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a WriteHash message.
                         * @function verify
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        WriteHash.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.level != null && message.hasOwnProperty("level"))
                                if (!$util.isString(message.level))
                                    return "level: string expected";
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                if (!$util.isString(message.message_preview))
                                    return "message_preview: string expected";
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (!$util.isInteger(message.seed) && !(message.seed && $util.isInteger(message.seed.low) && $util.isInteger(message.seed.high)))
                                    return "seed: integer|Long expected";
                            return null;
                        };
    
                        /**
                         * Creates a WriteHash message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.hash_service.WriteHash} WriteHash
                         */
                        WriteHash.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.hash_service.WriteHash)
                                return object;
                            var message = new $root.exonum.examples.logstore.hash_service.WriteHash();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.level != null)
                                message.level = String(object.level);
                            if (object.message_preview != null)
                                message.message_preview = String(object.message_preview);
                            if (object.seed != null)
                                if ($util.Long)
                                    (message.seed = $util.Long.fromValue(object.seed)).unsigned = true;
                                else if (typeof object.seed === "string")
                                    message.seed = parseInt(object.seed, 10);
                                else if (typeof object.seed === "number")
                                    message.seed = object.seed;
                                else if (typeof object.seed === "object")
                                    message.seed = new $util.LongBits(object.seed.low >>> 0, object.seed.high >>> 0).toNumber(true);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a WriteHash message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @static
                         * @param {exonum.examples.logstore.hash_service.WriteHash} message WriteHash
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        WriteHash.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                object.level = "";
                                object.message_preview = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.seed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.seed = options.longs === String ? "0" : 0;
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.level != null && message.hasOwnProperty("level"))
                                object.level = message.level;
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                object.message_preview = message.message_preview;
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (typeof message.seed === "number")
                                    object.seed = options.longs === String ? String(message.seed) : message.seed;
                                else
                                    object.seed = options.longs === String ? $util.Long.prototype.toString.call(message.seed) : options.longs === Number ? new $util.LongBits(message.seed.low >>> 0, message.seed.high >>> 0).toNumber(true) : message.seed;
                            return object;
                        };
    
                        /**
                         * Converts this WriteHash to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.hash_service.WriteHash
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        WriteHash.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return WriteHash;
                    })();
    
                    hash_service.HashRecord = (function() {
    
                        /**
                         * Properties of a HashRecord.
                         * @memberof exonum.examples.logstore.hash_service
                         * @interface IHashRecord
                         * @property {string|null} [content_hash] HashRecord content_hash
                         * @property {string|null} [level] HashRecord level
                         * @property {string|null} [message_preview] HashRecord message_preview
                         * @property {number|Long|null} [history_len] HashRecord history_len
                         * @property {exonum.crypto.IHash|null} [history_hash] HashRecord history_hash
                         * @property {string|null} [tx_hash] HashRecord tx_hash
                         */
    
                        /**
                         * Constructs a new HashRecord.
                         * @memberof exonum.examples.logstore.hash_service
                         * @classdesc Represents a HashRecord.
                         * @implements IHashRecord
                         * @constructor
                         * @param {exonum.examples.logstore.hash_service.IHashRecord=} [properties] Properties to set
                         */
                        function HashRecord(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * HashRecord content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.content_hash = "";
    
                        /**
                         * HashRecord level.
                         * @member {string} level
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.level = "";
    
                        /**
                         * HashRecord message_preview.
                         * @member {string} message_preview
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.message_preview = "";
    
                        /**
                         * HashRecord history_len.
                         * @member {number|Long} history_len
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.history_len = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * HashRecord history_hash.
                         * @member {exonum.crypto.IHash|null|undefined} history_hash
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.history_hash = null;
    
                        /**
                         * HashRecord tx_hash.
                         * @member {string} tx_hash
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         */
                        HashRecord.prototype.tx_hash = "";
    
                        /**
                         * Creates a new HashRecord instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IHashRecord=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.hash_service.HashRecord} HashRecord instance
                         */
                        HashRecord.create = function create(properties) {
                            return new HashRecord(properties);
                        };
    
                        /**
                         * Encodes the specified HashRecord message. Does not implicitly {@link exonum.examples.logstore.hash_service.HashRecord.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IHashRecord} message HashRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        HashRecord.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                                writer.uint32(/* id 2, wireType 2 =*/18).string(message.level);
                            if (message.message_preview != null && Object.hasOwnProperty.call(message, "message_preview"))
                                writer.uint32(/* id 3, wireType 2 =*/26).string(message.message_preview);
                            if (message.history_len != null && Object.hasOwnProperty.call(message, "history_len"))
                                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.history_len);
                            if (message.history_hash != null && Object.hasOwnProperty.call(message, "history_hash"))
                                $root.exonum.crypto.Hash.encode(message.history_hash, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                            if (message.tx_hash != null && Object.hasOwnProperty.call(message, "tx_hash"))
                                writer.uint32(/* id 6, wireType 2 =*/50).string(message.tx_hash);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified HashRecord message, length delimited. Does not implicitly {@link exonum.examples.logstore.hash_service.HashRecord.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {exonum.examples.logstore.hash_service.IHashRecord} message HashRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        HashRecord.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a HashRecord message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.hash_service.HashRecord} HashRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        HashRecord.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.hash_service.HashRecord();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.level = reader.string();
                                    break;
                                case 3:
                                    message.message_preview = reader.string();
                                    break;
                                case 4:
                                    message.history_len = reader.uint64();
                                    break;
                                case 5:
                                    message.history_hash = $root.exonum.crypto.Hash.decode(reader, reader.uint32());
                                    break;
                                case 6:
                                    message.tx_hash = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a HashRecord message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.hash_service.HashRecord} HashRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        HashRecord.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a HashRecord message.
                         * @function verify
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        HashRecord.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.level != null && message.hasOwnProperty("level"))
                                if (!$util.isString(message.level))
                                    return "level: string expected";
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                if (!$util.isString(message.message_preview))
                                    return "message_preview: string expected";
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (!$util.isInteger(message.history_len) && !(message.history_len && $util.isInteger(message.history_len.low) && $util.isInteger(message.history_len.high)))
                                    return "history_len: integer|Long expected";
                            if (message.history_hash != null && message.hasOwnProperty("history_hash")) {
                                var error = $root.exonum.crypto.Hash.verify(message.history_hash);
                                if (error)
                                    return "history_hash." + error;
                            }
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                if (!$util.isString(message.tx_hash))
                                    return "tx_hash: string expected";
                            return null;
                        };
    
                        /**
                         * Creates a HashRecord message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.hash_service.HashRecord} HashRecord
                         */
                        HashRecord.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.hash_service.HashRecord)
                                return object;
                            var message = new $root.exonum.examples.logstore.hash_service.HashRecord();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.level != null)
                                message.level = String(object.level);
                            if (object.message_preview != null)
                                message.message_preview = String(object.message_preview);
                            if (object.history_len != null)
                                if ($util.Long)
                                    (message.history_len = $util.Long.fromValue(object.history_len)).unsigned = true;
                                else if (typeof object.history_len === "string")
                                    message.history_len = parseInt(object.history_len, 10);
                                else if (typeof object.history_len === "number")
                                    message.history_len = object.history_len;
                                else if (typeof object.history_len === "object")
                                    message.history_len = new $util.LongBits(object.history_len.low >>> 0, object.history_len.high >>> 0).toNumber(true);
                            if (object.history_hash != null) {
                                if (typeof object.history_hash !== "object")
                                    throw TypeError(".exonum.examples.logstore.hash_service.HashRecord.history_hash: object expected");
                                message.history_hash = $root.exonum.crypto.Hash.fromObject(object.history_hash);
                            }
                            if (object.tx_hash != null)
                                message.tx_hash = String(object.tx_hash);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a HashRecord message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @static
                         * @param {exonum.examples.logstore.hash_service.HashRecord} message HashRecord
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        HashRecord.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                object.level = "";
                                object.message_preview = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.history_len = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.history_len = options.longs === String ? "0" : 0;
                                object.history_hash = null;
                                object.tx_hash = "";
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.level != null && message.hasOwnProperty("level"))
                                object.level = message.level;
                            if (message.message_preview != null && message.hasOwnProperty("message_preview"))
                                object.message_preview = message.message_preview;
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (typeof message.history_len === "number")
                                    object.history_len = options.longs === String ? String(message.history_len) : message.history_len;
                                else
                                    object.history_len = options.longs === String ? $util.Long.prototype.toString.call(message.history_len) : options.longs === Number ? new $util.LongBits(message.history_len.low >>> 0, message.history_len.high >>> 0).toNumber(true) : message.history_len;
                            if (message.history_hash != null && message.hasOwnProperty("history_hash"))
                                object.history_hash = $root.exonum.crypto.Hash.toObject(message.history_hash, options);
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                object.tx_hash = message.tx_hash;
                            return object;
                        };
    
                        /**
                         * Converts this HashRecord to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.hash_service.HashRecord
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        HashRecord.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return HashRecord;
                    })();
    
                    return hash_service;
                })();
    
                logstore.batch_service = (function() {
    
                    /**
                     * Namespace batch_service.
                     * @memberof exonum.examples.logstore
                     * @namespace
                     */
                    var batch_service = {};
    
                    batch_service.WriteBatch = (function() {
    
                        /**
                         * Properties of a WriteBatch.
                         * @memberof exonum.examples.logstore.batch_service
                         * @interface IWriteBatch
                         * @property {string|null} [content_hash] WriteBatch content_hash
                         * @property {number|Long|null} [seed] WriteBatch seed
                         * @property {string|null} [start_id] WriteBatch start_id
                         * @property {string|null} [end_id] WriteBatch end_id
                         * @property {number|null} [count] WriteBatch count
                         * @property {number|null} [debug_count] WriteBatch debug_count
                         * @property {number|null} [info_count] WriteBatch info_count
                         * @property {number|null} [warn_count] WriteBatch warn_count
                         * @property {number|null} [error_count] WriteBatch error_count
                         * @property {number|null} [critical_count] WriteBatch critical_count
                         * @property {string|null} [max_severity] WriteBatch max_severity
                         */
    
                        /**
                         * Constructs a new WriteBatch.
                         * @memberof exonum.examples.logstore.batch_service
                         * @classdesc Represents a WriteBatch.
                         * @implements IWriteBatch
                         * @constructor
                         * @param {exonum.examples.logstore.batch_service.IWriteBatch=} [properties] Properties to set
                         */
                        function WriteBatch(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * WriteBatch content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.content_hash = "";
    
                        /**
                         * WriteBatch seed.
                         * @member {number|Long} seed
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.seed = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * WriteBatch start_id.
                         * @member {string} start_id
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.start_id = "";
    
                        /**
                         * WriteBatch end_id.
                         * @member {string} end_id
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.end_id = "";
    
                        /**
                         * WriteBatch count.
                         * @member {number} count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.count = 0;
    
                        /**
                         * WriteBatch debug_count.
                         * @member {number} debug_count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.debug_count = 0;
    
                        /**
                         * WriteBatch info_count.
                         * @member {number} info_count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.info_count = 0;
    
                        /**
                         * WriteBatch warn_count.
                         * @member {number} warn_count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.warn_count = 0;
    
                        /**
                         * WriteBatch error_count.
                         * @member {number} error_count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.error_count = 0;
    
                        /**
                         * WriteBatch critical_count.
                         * @member {number} critical_count
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.critical_count = 0;
    
                        /**
                         * WriteBatch max_severity.
                         * @member {string} max_severity
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         */
                        WriteBatch.prototype.max_severity = "";
    
                        /**
                         * Creates a new WriteBatch instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IWriteBatch=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.batch_service.WriteBatch} WriteBatch instance
                         */
                        WriteBatch.create = function create(properties) {
                            return new WriteBatch(properties);
                        };
    
                        /**
                         * Encodes the specified WriteBatch message. Does not implicitly {@link exonum.examples.logstore.batch_service.WriteBatch.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IWriteBatch} message WriteBatch message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteBatch.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.seed != null && Object.hasOwnProperty.call(message, "seed"))
                                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.seed);
                            if (message.start_id != null && Object.hasOwnProperty.call(message, "start_id"))
                                writer.uint32(/* id 3, wireType 2 =*/26).string(message.start_id);
                            if (message.end_id != null && Object.hasOwnProperty.call(message, "end_id"))
                                writer.uint32(/* id 4, wireType 2 =*/34).string(message.end_id);
                            if (message.count != null && Object.hasOwnProperty.call(message, "count"))
                                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.count);
                            if (message.debug_count != null && Object.hasOwnProperty.call(message, "debug_count"))
                                writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.debug_count);
                            if (message.info_count != null && Object.hasOwnProperty.call(message, "info_count"))
                                writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.info_count);
                            if (message.warn_count != null && Object.hasOwnProperty.call(message, "warn_count"))
                                writer.uint32(/* id 8, wireType 0 =*/64).uint32(message.warn_count);
                            if (message.error_count != null && Object.hasOwnProperty.call(message, "error_count"))
                                writer.uint32(/* id 9, wireType 0 =*/72).uint32(message.error_count);
                            if (message.critical_count != null && Object.hasOwnProperty.call(message, "critical_count"))
                                writer.uint32(/* id 10, wireType 0 =*/80).uint32(message.critical_count);
                            if (message.max_severity != null && Object.hasOwnProperty.call(message, "max_severity"))
                                writer.uint32(/* id 11, wireType 2 =*/90).string(message.max_severity);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified WriteBatch message, length delimited. Does not implicitly {@link exonum.examples.logstore.batch_service.WriteBatch.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IWriteBatch} message WriteBatch message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        WriteBatch.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a WriteBatch message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.batch_service.WriteBatch} WriteBatch
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteBatch.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.batch_service.WriteBatch();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.seed = reader.uint64();
                                    break;
                                case 3:
                                    message.start_id = reader.string();
                                    break;
                                case 4:
                                    message.end_id = reader.string();
                                    break;
                                case 5:
                                    message.count = reader.uint32();
                                    break;
                                case 6:
                                    message.debug_count = reader.uint32();
                                    break;
                                case 7:
                                    message.info_count = reader.uint32();
                                    break;
                                case 8:
                                    message.warn_count = reader.uint32();
                                    break;
                                case 9:
                                    message.error_count = reader.uint32();
                                    break;
                                case 10:
                                    message.critical_count = reader.uint32();
                                    break;
                                case 11:
                                    message.max_severity = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a WriteBatch message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.batch_service.WriteBatch} WriteBatch
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        WriteBatch.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a WriteBatch message.
                         * @function verify
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        WriteBatch.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (!$util.isInteger(message.seed) && !(message.seed && $util.isInteger(message.seed.low) && $util.isInteger(message.seed.high)))
                                    return "seed: integer|Long expected";
                            if (message.start_id != null && message.hasOwnProperty("start_id"))
                                if (!$util.isString(message.start_id))
                                    return "start_id: string expected";
                            if (message.end_id != null && message.hasOwnProperty("end_id"))
                                if (!$util.isString(message.end_id))
                                    return "end_id: string expected";
                            if (message.count != null && message.hasOwnProperty("count"))
                                if (!$util.isInteger(message.count))
                                    return "count: integer expected";
                            if (message.debug_count != null && message.hasOwnProperty("debug_count"))
                                if (!$util.isInteger(message.debug_count))
                                    return "debug_count: integer expected";
                            if (message.info_count != null && message.hasOwnProperty("info_count"))
                                if (!$util.isInteger(message.info_count))
                                    return "info_count: integer expected";
                            if (message.warn_count != null && message.hasOwnProperty("warn_count"))
                                if (!$util.isInteger(message.warn_count))
                                    return "warn_count: integer expected";
                            if (message.error_count != null && message.hasOwnProperty("error_count"))
                                if (!$util.isInteger(message.error_count))
                                    return "error_count: integer expected";
                            if (message.critical_count != null && message.hasOwnProperty("critical_count"))
                                if (!$util.isInteger(message.critical_count))
                                    return "critical_count: integer expected";
                            if (message.max_severity != null && message.hasOwnProperty("max_severity"))
                                if (!$util.isString(message.max_severity))
                                    return "max_severity: string expected";
                            return null;
                        };
    
                        /**
                         * Creates a WriteBatch message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.batch_service.WriteBatch} WriteBatch
                         */
                        WriteBatch.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.batch_service.WriteBatch)
                                return object;
                            var message = new $root.exonum.examples.logstore.batch_service.WriteBatch();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.seed != null)
                                if ($util.Long)
                                    (message.seed = $util.Long.fromValue(object.seed)).unsigned = true;
                                else if (typeof object.seed === "string")
                                    message.seed = parseInt(object.seed, 10);
                                else if (typeof object.seed === "number")
                                    message.seed = object.seed;
                                else if (typeof object.seed === "object")
                                    message.seed = new $util.LongBits(object.seed.low >>> 0, object.seed.high >>> 0).toNumber(true);
                            if (object.start_id != null)
                                message.start_id = String(object.start_id);
                            if (object.end_id != null)
                                message.end_id = String(object.end_id);
                            if (object.count != null)
                                message.count = object.count >>> 0;
                            if (object.debug_count != null)
                                message.debug_count = object.debug_count >>> 0;
                            if (object.info_count != null)
                                message.info_count = object.info_count >>> 0;
                            if (object.warn_count != null)
                                message.warn_count = object.warn_count >>> 0;
                            if (object.error_count != null)
                                message.error_count = object.error_count >>> 0;
                            if (object.critical_count != null)
                                message.critical_count = object.critical_count >>> 0;
                            if (object.max_severity != null)
                                message.max_severity = String(object.max_severity);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a WriteBatch message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @static
                         * @param {exonum.examples.logstore.batch_service.WriteBatch} message WriteBatch
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        WriteBatch.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.seed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.seed = options.longs === String ? "0" : 0;
                                object.start_id = "";
                                object.end_id = "";
                                object.count = 0;
                                object.debug_count = 0;
                                object.info_count = 0;
                                object.warn_count = 0;
                                object.error_count = 0;
                                object.critical_count = 0;
                                object.max_severity = "";
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.seed != null && message.hasOwnProperty("seed"))
                                if (typeof message.seed === "number")
                                    object.seed = options.longs === String ? String(message.seed) : message.seed;
                                else
                                    object.seed = options.longs === String ? $util.Long.prototype.toString.call(message.seed) : options.longs === Number ? new $util.LongBits(message.seed.low >>> 0, message.seed.high >>> 0).toNumber(true) : message.seed;
                            if (message.start_id != null && message.hasOwnProperty("start_id"))
                                object.start_id = message.start_id;
                            if (message.end_id != null && message.hasOwnProperty("end_id"))
                                object.end_id = message.end_id;
                            if (message.count != null && message.hasOwnProperty("count"))
                                object.count = message.count;
                            if (message.debug_count != null && message.hasOwnProperty("debug_count"))
                                object.debug_count = message.debug_count;
                            if (message.info_count != null && message.hasOwnProperty("info_count"))
                                object.info_count = message.info_count;
                            if (message.warn_count != null && message.hasOwnProperty("warn_count"))
                                object.warn_count = message.warn_count;
                            if (message.error_count != null && message.hasOwnProperty("error_count"))
                                object.error_count = message.error_count;
                            if (message.critical_count != null && message.hasOwnProperty("critical_count"))
                                object.critical_count = message.critical_count;
                            if (message.max_severity != null && message.hasOwnProperty("max_severity"))
                                object.max_severity = message.max_severity;
                            return object;
                        };
    
                        /**
                         * Converts this WriteBatch to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.batch_service.WriteBatch
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        WriteBatch.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return WriteBatch;
                    })();
    
                    batch_service.BatchRecord = (function() {
    
                        /**
                         * Properties of a BatchRecord.
                         * @memberof exonum.examples.logstore.batch_service
                         * @interface IBatchRecord
                         * @property {string|null} [content_hash] BatchRecord content_hash
                         * @property {number|Long|null} [history_len] BatchRecord history_len
                         * @property {exonum.crypto.IHash|null} [history_hash] BatchRecord history_hash
                         * @property {string|null} [tx_hash] BatchRecord tx_hash
                         * @property {string|null} [start_id] BatchRecord start_id
                         * @property {string|null} [end_id] BatchRecord end_id
                         * @property {number|null} [count] BatchRecord count
                         * @property {number|null} [debug_count] BatchRecord debug_count
                         * @property {number|null} [info_count] BatchRecord info_count
                         * @property {number|null} [warn_count] BatchRecord warn_count
                         * @property {number|null} [error_count] BatchRecord error_count
                         * @property {number|null} [critical_count] BatchRecord critical_count
                         * @property {string|null} [max_severity] BatchRecord max_severity
                         */
    
                        /**
                         * Constructs a new BatchRecord.
                         * @memberof exonum.examples.logstore.batch_service
                         * @classdesc Represents a BatchRecord.
                         * @implements IBatchRecord
                         * @constructor
                         * @param {exonum.examples.logstore.batch_service.IBatchRecord=} [properties] Properties to set
                         */
                        function BatchRecord(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
    
                        /**
                         * BatchRecord content_hash.
                         * @member {string} content_hash
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.content_hash = "";
    
                        /**
                         * BatchRecord history_len.
                         * @member {number|Long} history_len
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.history_len = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
                        /**
                         * BatchRecord history_hash.
                         * @member {exonum.crypto.IHash|null|undefined} history_hash
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.history_hash = null;
    
                        /**
                         * BatchRecord tx_hash.
                         * @member {string} tx_hash
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.tx_hash = "";
    
                        /**
                         * BatchRecord start_id.
                         * @member {string} start_id
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.start_id = "";
    
                        /**
                         * BatchRecord end_id.
                         * @member {string} end_id
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.end_id = "";
    
                        /**
                         * BatchRecord count.
                         * @member {number} count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.count = 0;
    
                        /**
                         * BatchRecord debug_count.
                         * @member {number} debug_count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.debug_count = 0;
    
                        /**
                         * BatchRecord info_count.
                         * @member {number} info_count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.info_count = 0;
    
                        /**
                         * BatchRecord warn_count.
                         * @member {number} warn_count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.warn_count = 0;
    
                        /**
                         * BatchRecord error_count.
                         * @member {number} error_count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.error_count = 0;
    
                        /**
                         * BatchRecord critical_count.
                         * @member {number} critical_count
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.critical_count = 0;
    
                        /**
                         * BatchRecord max_severity.
                         * @member {string} max_severity
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         */
                        BatchRecord.prototype.max_severity = "";
    
                        /**
                         * Creates a new BatchRecord instance using the specified properties.
                         * @function create
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IBatchRecord=} [properties] Properties to set
                         * @returns {exonum.examples.logstore.batch_service.BatchRecord} BatchRecord instance
                         */
                        BatchRecord.create = function create(properties) {
                            return new BatchRecord(properties);
                        };
    
                        /**
                         * Encodes the specified BatchRecord message. Does not implicitly {@link exonum.examples.logstore.batch_service.BatchRecord.verify|verify} messages.
                         * @function encode
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IBatchRecord} message BatchRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        BatchRecord.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.content_hash != null && Object.hasOwnProperty.call(message, "content_hash"))
                                writer.uint32(/* id 1, wireType 2 =*/10).string(message.content_hash);
                            if (message.history_len != null && Object.hasOwnProperty.call(message, "history_len"))
                                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.history_len);
                            if (message.history_hash != null && Object.hasOwnProperty.call(message, "history_hash"))
                                $root.exonum.crypto.Hash.encode(message.history_hash, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                            if (message.tx_hash != null && Object.hasOwnProperty.call(message, "tx_hash"))
                                writer.uint32(/* id 4, wireType 2 =*/34).string(message.tx_hash);
                            if (message.start_id != null && Object.hasOwnProperty.call(message, "start_id"))
                                writer.uint32(/* id 5, wireType 2 =*/42).string(message.start_id);
                            if (message.end_id != null && Object.hasOwnProperty.call(message, "end_id"))
                                writer.uint32(/* id 6, wireType 2 =*/50).string(message.end_id);
                            if (message.count != null && Object.hasOwnProperty.call(message, "count"))
                                writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.count);
                            if (message.debug_count != null && Object.hasOwnProperty.call(message, "debug_count"))
                                writer.uint32(/* id 8, wireType 0 =*/64).uint32(message.debug_count);
                            if (message.info_count != null && Object.hasOwnProperty.call(message, "info_count"))
                                writer.uint32(/* id 9, wireType 0 =*/72).uint32(message.info_count);
                            if (message.warn_count != null && Object.hasOwnProperty.call(message, "warn_count"))
                                writer.uint32(/* id 10, wireType 0 =*/80).uint32(message.warn_count);
                            if (message.error_count != null && Object.hasOwnProperty.call(message, "error_count"))
                                writer.uint32(/* id 11, wireType 0 =*/88).uint32(message.error_count);
                            if (message.critical_count != null && Object.hasOwnProperty.call(message, "critical_count"))
                                writer.uint32(/* id 12, wireType 0 =*/96).uint32(message.critical_count);
                            if (message.max_severity != null && Object.hasOwnProperty.call(message, "max_severity"))
                                writer.uint32(/* id 13, wireType 2 =*/106).string(message.max_severity);
                            return writer;
                        };
    
                        /**
                         * Encodes the specified BatchRecord message, length delimited. Does not implicitly {@link exonum.examples.logstore.batch_service.BatchRecord.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {exonum.examples.logstore.batch_service.IBatchRecord} message BatchRecord message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        BatchRecord.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
    
                        /**
                         * Decodes a BatchRecord message from the specified reader or buffer.
                         * @function decode
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {exonum.examples.logstore.batch_service.BatchRecord} BatchRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        BatchRecord.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.examples.logstore.batch_service.BatchRecord();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                case 1:
                                    message.content_hash = reader.string();
                                    break;
                                case 2:
                                    message.history_len = reader.uint64();
                                    break;
                                case 3:
                                    message.history_hash = $root.exonum.crypto.Hash.decode(reader, reader.uint32());
                                    break;
                                case 4:
                                    message.tx_hash = reader.string();
                                    break;
                                case 5:
                                    message.start_id = reader.string();
                                    break;
                                case 6:
                                    message.end_id = reader.string();
                                    break;
                                case 7:
                                    message.count = reader.uint32();
                                    break;
                                case 8:
                                    message.debug_count = reader.uint32();
                                    break;
                                case 9:
                                    message.info_count = reader.uint32();
                                    break;
                                case 10:
                                    message.warn_count = reader.uint32();
                                    break;
                                case 11:
                                    message.error_count = reader.uint32();
                                    break;
                                case 12:
                                    message.critical_count = reader.uint32();
                                    break;
                                case 13:
                                    message.max_severity = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                                }
                            }
                            return message;
                        };
    
                        /**
                         * Decodes a BatchRecord message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {exonum.examples.logstore.batch_service.BatchRecord} BatchRecord
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        BatchRecord.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
    
                        /**
                         * Verifies a BatchRecord message.
                         * @function verify
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        BatchRecord.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                if (!$util.isString(message.content_hash))
                                    return "content_hash: string expected";
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (!$util.isInteger(message.history_len) && !(message.history_len && $util.isInteger(message.history_len.low) && $util.isInteger(message.history_len.high)))
                                    return "history_len: integer|Long expected";
                            if (message.history_hash != null && message.hasOwnProperty("history_hash")) {
                                var error = $root.exonum.crypto.Hash.verify(message.history_hash);
                                if (error)
                                    return "history_hash." + error;
                            }
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                if (!$util.isString(message.tx_hash))
                                    return "tx_hash: string expected";
                            if (message.start_id != null && message.hasOwnProperty("start_id"))
                                if (!$util.isString(message.start_id))
                                    return "start_id: string expected";
                            if (message.end_id != null && message.hasOwnProperty("end_id"))
                                if (!$util.isString(message.end_id))
                                    return "end_id: string expected";
                            if (message.count != null && message.hasOwnProperty("count"))
                                if (!$util.isInteger(message.count))
                                    return "count: integer expected";
                            if (message.debug_count != null && message.hasOwnProperty("debug_count"))
                                if (!$util.isInteger(message.debug_count))
                                    return "debug_count: integer expected";
                            if (message.info_count != null && message.hasOwnProperty("info_count"))
                                if (!$util.isInteger(message.info_count))
                                    return "info_count: integer expected";
                            if (message.warn_count != null && message.hasOwnProperty("warn_count"))
                                if (!$util.isInteger(message.warn_count))
                                    return "warn_count: integer expected";
                            if (message.error_count != null && message.hasOwnProperty("error_count"))
                                if (!$util.isInteger(message.error_count))
                                    return "error_count: integer expected";
                            if (message.critical_count != null && message.hasOwnProperty("critical_count"))
                                if (!$util.isInteger(message.critical_count))
                                    return "critical_count: integer expected";
                            if (message.max_severity != null && message.hasOwnProperty("max_severity"))
                                if (!$util.isString(message.max_severity))
                                    return "max_severity: string expected";
                            return null;
                        };
    
                        /**
                         * Creates a BatchRecord message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {exonum.examples.logstore.batch_service.BatchRecord} BatchRecord
                         */
                        BatchRecord.fromObject = function fromObject(object) {
                            if (object instanceof $root.exonum.examples.logstore.batch_service.BatchRecord)
                                return object;
                            var message = new $root.exonum.examples.logstore.batch_service.BatchRecord();
                            if (object.content_hash != null)
                                message.content_hash = String(object.content_hash);
                            if (object.history_len != null)
                                if ($util.Long)
                                    (message.history_len = $util.Long.fromValue(object.history_len)).unsigned = true;
                                else if (typeof object.history_len === "string")
                                    message.history_len = parseInt(object.history_len, 10);
                                else if (typeof object.history_len === "number")
                                    message.history_len = object.history_len;
                                else if (typeof object.history_len === "object")
                                    message.history_len = new $util.LongBits(object.history_len.low >>> 0, object.history_len.high >>> 0).toNumber(true);
                            if (object.history_hash != null) {
                                if (typeof object.history_hash !== "object")
                                    throw TypeError(".exonum.examples.logstore.batch_service.BatchRecord.history_hash: object expected");
                                message.history_hash = $root.exonum.crypto.Hash.fromObject(object.history_hash);
                            }
                            if (object.tx_hash != null)
                                message.tx_hash = String(object.tx_hash);
                            if (object.start_id != null)
                                message.start_id = String(object.start_id);
                            if (object.end_id != null)
                                message.end_id = String(object.end_id);
                            if (object.count != null)
                                message.count = object.count >>> 0;
                            if (object.debug_count != null)
                                message.debug_count = object.debug_count >>> 0;
                            if (object.info_count != null)
                                message.info_count = object.info_count >>> 0;
                            if (object.warn_count != null)
                                message.warn_count = object.warn_count >>> 0;
                            if (object.error_count != null)
                                message.error_count = object.error_count >>> 0;
                            if (object.critical_count != null)
                                message.critical_count = object.critical_count >>> 0;
                            if (object.max_severity != null)
                                message.max_severity = String(object.max_severity);
                            return message;
                        };
    
                        /**
                         * Creates a plain object from a BatchRecord message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @static
                         * @param {exonum.examples.logstore.batch_service.BatchRecord} message BatchRecord
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        BatchRecord.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.content_hash = "";
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, true);
                                    object.history_len = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                } else
                                    object.history_len = options.longs === String ? "0" : 0;
                                object.history_hash = null;
                                object.tx_hash = "";
                                object.start_id = "";
                                object.end_id = "";
                                object.count = 0;
                                object.debug_count = 0;
                                object.info_count = 0;
                                object.warn_count = 0;
                                object.error_count = 0;
                                object.critical_count = 0;
                                object.max_severity = "";
                            }
                            if (message.content_hash != null && message.hasOwnProperty("content_hash"))
                                object.content_hash = message.content_hash;
                            if (message.history_len != null && message.hasOwnProperty("history_len"))
                                if (typeof message.history_len === "number")
                                    object.history_len = options.longs === String ? String(message.history_len) : message.history_len;
                                else
                                    object.history_len = options.longs === String ? $util.Long.prototype.toString.call(message.history_len) : options.longs === Number ? new $util.LongBits(message.history_len.low >>> 0, message.history_len.high >>> 0).toNumber(true) : message.history_len;
                            if (message.history_hash != null && message.hasOwnProperty("history_hash"))
                                object.history_hash = $root.exonum.crypto.Hash.toObject(message.history_hash, options);
                            if (message.tx_hash != null && message.hasOwnProperty("tx_hash"))
                                object.tx_hash = message.tx_hash;
                            if (message.start_id != null && message.hasOwnProperty("start_id"))
                                object.start_id = message.start_id;
                            if (message.end_id != null && message.hasOwnProperty("end_id"))
                                object.end_id = message.end_id;
                            if (message.count != null && message.hasOwnProperty("count"))
                                object.count = message.count;
                            if (message.debug_count != null && message.hasOwnProperty("debug_count"))
                                object.debug_count = message.debug_count;
                            if (message.info_count != null && message.hasOwnProperty("info_count"))
                                object.info_count = message.info_count;
                            if (message.warn_count != null && message.hasOwnProperty("warn_count"))
                                object.warn_count = message.warn_count;
                            if (message.error_count != null && message.hasOwnProperty("error_count"))
                                object.error_count = message.error_count;
                            if (message.critical_count != null && message.hasOwnProperty("critical_count"))
                                object.critical_count = message.critical_count;
                            if (message.max_severity != null && message.hasOwnProperty("max_severity"))
                                object.max_severity = message.max_severity;
                            return object;
                        };
    
                        /**
                         * Converts this BatchRecord to JSON.
                         * @function toJSON
                         * @memberof exonum.examples.logstore.batch_service.BatchRecord
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        BatchRecord.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
    
                        return BatchRecord;
                    })();
    
                    return batch_service;
                })();
    
                return logstore;
            })();
    
            return examples;
        })();
    
        exonum.crypto = (function() {
    
            /**
             * Namespace crypto.
             * @memberof exonum
             * @namespace
             */
            var crypto = {};
    
            crypto.Hash = (function() {
    
                /**
                 * Properties of a Hash.
                 * @memberof exonum.crypto
                 * @interface IHash
                 * @property {Uint8Array|null} [data] Hash data
                 */
    
                /**
                 * Constructs a new Hash.
                 * @memberof exonum.crypto
                 * @classdesc Represents a Hash.
                 * @implements IHash
                 * @constructor
                 * @param {exonum.crypto.IHash=} [properties] Properties to set
                 */
                function Hash(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }
    
                /**
                 * Hash data.
                 * @member {Uint8Array} data
                 * @memberof exonum.crypto.Hash
                 * @instance
                 */
                Hash.prototype.data = $util.newBuffer([]);
    
                /**
                 * Creates a new Hash instance using the specified properties.
                 * @function create
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {exonum.crypto.IHash=} [properties] Properties to set
                 * @returns {exonum.crypto.Hash} Hash instance
                 */
                Hash.create = function create(properties) {
                    return new Hash(properties);
                };
    
                /**
                 * Encodes the specified Hash message. Does not implicitly {@link exonum.crypto.Hash.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {exonum.crypto.IHash} message Hash message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Hash.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };
    
                /**
                 * Encodes the specified Hash message, length delimited. Does not implicitly {@link exonum.crypto.Hash.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {exonum.crypto.IHash} message Hash message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Hash.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };
    
                /**
                 * Decodes a Hash message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.crypto.Hash} Hash
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Hash.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.crypto.Hash();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };
    
                /**
                 * Decodes a Hash message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.crypto.Hash} Hash
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Hash.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };
    
                /**
                 * Verifies a Hash message.
                 * @function verify
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Hash.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };
    
                /**
                 * Creates a Hash message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.crypto.Hash} Hash
                 */
                Hash.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.crypto.Hash)
                        return object;
                    var message = new $root.exonum.crypto.Hash();
                    if (object.data != null)
                        if (typeof object.data === "string")
                            $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                        else if (object.data.length)
                            message.data = object.data;
                    return message;
                };
    
                /**
                 * Creates a plain object from a Hash message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.crypto.Hash
                 * @static
                 * @param {exonum.crypto.Hash} message Hash
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Hash.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        if (options.bytes === String)
                            object.data = "";
                        else {
                            object.data = [];
                            if (options.bytes !== Array)
                                object.data = $util.newBuffer(object.data);
                        }
                    if (message.data != null && message.hasOwnProperty("data"))
                        object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                    return object;
                };
    
                /**
                 * Converts this Hash to JSON.
                 * @function toJSON
                 * @memberof exonum.crypto.Hash
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Hash.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };
    
                return Hash;
            })();
    
            crypto.PublicKey = (function() {
    
                /**
                 * Properties of a PublicKey.
                 * @memberof exonum.crypto
                 * @interface IPublicKey
                 * @property {Uint8Array|null} [data] PublicKey data
                 */
    
                /**
                 * Constructs a new PublicKey.
                 * @memberof exonum.crypto
                 * @classdesc Represents a PublicKey.
                 * @implements IPublicKey
                 * @constructor
                 * @param {exonum.crypto.IPublicKey=} [properties] Properties to set
                 */
                function PublicKey(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }
    
                /**
                 * PublicKey data.
                 * @member {Uint8Array} data
                 * @memberof exonum.crypto.PublicKey
                 * @instance
                 */
                PublicKey.prototype.data = $util.newBuffer([]);
    
                /**
                 * Creates a new PublicKey instance using the specified properties.
                 * @function create
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {exonum.crypto.IPublicKey=} [properties] Properties to set
                 * @returns {exonum.crypto.PublicKey} PublicKey instance
                 */
                PublicKey.create = function create(properties) {
                    return new PublicKey(properties);
                };
    
                /**
                 * Encodes the specified PublicKey message. Does not implicitly {@link exonum.crypto.PublicKey.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {exonum.crypto.IPublicKey} message PublicKey message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublicKey.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };
    
                /**
                 * Encodes the specified PublicKey message, length delimited. Does not implicitly {@link exonum.crypto.PublicKey.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {exonum.crypto.IPublicKey} message PublicKey message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublicKey.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };
    
                /**
                 * Decodes a PublicKey message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.crypto.PublicKey} PublicKey
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublicKey.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.crypto.PublicKey();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };
    
                /**
                 * Decodes a PublicKey message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.crypto.PublicKey} PublicKey
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublicKey.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };
    
                /**
                 * Verifies a PublicKey message.
                 * @function verify
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PublicKey.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };
    
                /**
                 * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.crypto.PublicKey} PublicKey
                 */
                PublicKey.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.crypto.PublicKey)
                        return object;
                    var message = new $root.exonum.crypto.PublicKey();
                    if (object.data != null)
                        if (typeof object.data === "string")
                            $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                        else if (object.data.length)
                            message.data = object.data;
                    return message;
                };
    
                /**
                 * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.crypto.PublicKey
                 * @static
                 * @param {exonum.crypto.PublicKey} message PublicKey
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                PublicKey.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        if (options.bytes === String)
                            object.data = "";
                        else {
                            object.data = [];
                            if (options.bytes !== Array)
                                object.data = $util.newBuffer(object.data);
                        }
                    if (message.data != null && message.hasOwnProperty("data"))
                        object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                    return object;
                };
    
                /**
                 * Converts this PublicKey to JSON.
                 * @function toJSON
                 * @memberof exonum.crypto.PublicKey
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                PublicKey.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };
    
                return PublicKey;
            })();
    
            crypto.Signature = (function() {
    
                /**
                 * Properties of a Signature.
                 * @memberof exonum.crypto
                 * @interface ISignature
                 * @property {Uint8Array|null} [data] Signature data
                 */
    
                /**
                 * Constructs a new Signature.
                 * @memberof exonum.crypto
                 * @classdesc Represents a Signature.
                 * @implements ISignature
                 * @constructor
                 * @param {exonum.crypto.ISignature=} [properties] Properties to set
                 */
                function Signature(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }
    
                /**
                 * Signature data.
                 * @member {Uint8Array} data
                 * @memberof exonum.crypto.Signature
                 * @instance
                 */
                Signature.prototype.data = $util.newBuffer([]);
    
                /**
                 * Creates a new Signature instance using the specified properties.
                 * @function create
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {exonum.crypto.ISignature=} [properties] Properties to set
                 * @returns {exonum.crypto.Signature} Signature instance
                 */
                Signature.create = function create(properties) {
                    return new Signature(properties);
                };
    
                /**
                 * Encodes the specified Signature message. Does not implicitly {@link exonum.crypto.Signature.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {exonum.crypto.ISignature} message Signature message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Signature.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };
    
                /**
                 * Encodes the specified Signature message, length delimited. Does not implicitly {@link exonum.crypto.Signature.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {exonum.crypto.ISignature} message Signature message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Signature.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };
    
                /**
                 * Decodes a Signature message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.crypto.Signature} Signature
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Signature.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.exonum.crypto.Signature();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };
    
                /**
                 * Decodes a Signature message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.crypto.Signature} Signature
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Signature.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };
    
                /**
                 * Verifies a Signature message.
                 * @function verify
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Signature.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };
    
                /**
                 * Creates a Signature message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.crypto.Signature} Signature
                 */
                Signature.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.crypto.Signature)
                        return object;
                    var message = new $root.exonum.crypto.Signature();
                    if (object.data != null)
                        if (typeof object.data === "string")
                            $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                        else if (object.data.length)
                            message.data = object.data;
                    return message;
                };
    
                /**
                 * Creates a plain object from a Signature message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.crypto.Signature
                 * @static
                 * @param {exonum.crypto.Signature} message Signature
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Signature.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        if (options.bytes === String)
                            object.data = "";
                        else {
                            object.data = [];
                            if (options.bytes !== Array)
                                object.data = $util.newBuffer(object.data);
                        }
                    if (message.data != null && message.hasOwnProperty("data"))
                        object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                    return object;
                };
    
                /**
                 * Converts this Signature to JSON.
                 * @function toJSON
                 * @memberof exonum.crypto.Signature
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Signature.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };
    
                return Signature;
            })();
    
            return crypto;
        })();
    
        return exonum;
    })();

    return $root;
});
