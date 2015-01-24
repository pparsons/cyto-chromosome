/**
 * INTERACTIVE CHROMOSOME VISUALIZATION
 * opt : initialization options object
 *  + target:
 *  + segment:
 *  - dasSource:
 *  - width:
 *
 *
 */

var d3 = require("d3");
var $ = require("jquery");
var ModelLoader = require("./model-loader");

var Chromosome = (function () {
    "use strict";
    var chr = function (opt) {

        var self = this,
            CHR1_BP_END = 248956422,
            STALK_MAG_PC = 0.8,
            PADDING = 30,
            LABEL_PADDING = 24,
            AXIS_SPACING = 4,
            STALK_SPACING = 3;

        var options = (function () {

            return $.extend({}, {
                //DEFAULT OPTIONS
                dasSource : "http://www.ensembl.org/das/Homo_sapiens.GRCh38.karyotype",
                width: 900,
                height: 20,
                relativeSize: false,
                includeAxis: false,
                includeSelector: true
            }, opt || {});
        }());

        var _modelLoader = new ModelLoader({
            source: options.dasSource,
            segment: options.segment
        });

        var _model;
        var _brush;
        this.info = function () {
            return options;
        };

        this.moveSelectorTo = function (to, from) {
            if (options.includeSelector) {
                _brush.extent([to, from]);
                var selector = d3.select(options.target + ' .selector');
                selector.call(_brush);


            }
        }

        this.getCurrentSelection = function () {
            if (options.includeSelector && (typeof _brush !== 'undefined')) {
                var ar = _brush.extent();
                return {
                    start: ar[0],
                    end: ar[1]
                };
            }
        };

        this.draw = function () {
            _modelLoader.loadModel(function (model) {
                console.log(model);
                _model = model;
                if (typeof model.err === 'undefined') {
                    $(function () {
                        var rangeTo = options.relativeSize
                            ? ((+model.stop / CHR1_BP_END) * options.width) - PADDING
                            : options.width - PADDING;

                        var scaleFn = d3.scale.linear()
                            .domain([model.start, model.stop])
                            .range([0, rangeTo]);

                        var visTarget = d3.select(options.target)
                            .attr('width', options.width)
                            .attr('height', options.height + (2 * PADDING));

                        if (!visTarget.empty()) {

                            var band = visTarget.selectAll(options.target + " g")
                                .data(model.bands)
                                .enter().append("g");

                            //band.append("title")
                            //    .text(function(m) {return m.id; });

                            band.append('rect')
                                .attr('class', function (m) {
                                    return m.TYPE.id.replace(':', ' ');
                                })
                                .attr('height', function (m) {
                                    return (m.TYPE.id === "band:stalk") ? (options.height * STALK_MAG_PC) : options.height;
                                })
                                .attr('width', function (m) {
                                    return scaleFn(+m.END.textContent) - scaleFn(+m.START.textContent);
                                })
                                .attr('x', function (m) {
                                    return scaleFn(m.START.textContent);
                                })
                                .attr('y', function (m) {
                                    return (m.TYPE.id === "band:stalk") ? (PADDING + STALK_SPACING) : PADDING;
                                });

                            var label = visTarget.append("text")
                                .attr("class", "band-lbl")
                                .attr("y", LABEL_PADDING);

                            band.on("mouseover", function (m) {
                                label.text(m.id)
                                    .attr('x', (scaleFn(m.START.textContent)));
                            });

                            band.on("click", function (m) {
                                var start = +m.START.textContent,
                                    end = +m.END.textContent

                                self.moveSelectorTo(start, end);

                                self.trigger("bandSelection", {
                                    segment: options.segment,
                                    bandID: m.id,
                                    start: start,
                                    end: end
                                });
                            });

                            if (options.includeAxis) {
                                var bpAxis = d3.svg.axis()
                                    .scale(scaleFn)
                                    .tickFormat(d3.format('s'))
                                    .orient("bottom");

                                visTarget.append('g')
                                    .attr('class', 'bp-axis')
                                    .attr('transform', 'translate(0,' + (options.height + PADDING + AXIS_SPACING) + ")")
                                    .call(bpAxis);
                            }

                            if (options.includeSelector) {
                                _brush = d3.svg.brush()
                                    .x(scaleFn);

                                var selector = visTarget.append("g")
                                    .classed('selector', true)
                                    .attr('transform',"translate(0,"+ (PADDING - AXIS_SPACING)+")")
                                    .call(_brush);

                                selector.selectAll('rect')
                                    .attr('height', options.height + (AXIS_SPACING * 2));

                                selector.select('.background').remove();

                                _brush.on('brush', function () {
                                    var selectedArea = _brush.extent();
                                    self.trigger('selectionChange', {
                                        segment: options.segment,
                                        start: selectedArea[0],
                                        end: selectedArea[1]
                                    });
                                });
                            }

                        } else {
                            //No html target set
                            console.log("cyto-Chromosome: invalid html target handle");
                        }

                        self.trigger('modelLoaded', {
                            id: model.id
                        });

                    });
                }
            });
            return self;
        };
    };

    return chr;
}());

require('biojs-events').mixin(Chromosome.prototype);
module.exports = Chromosome;