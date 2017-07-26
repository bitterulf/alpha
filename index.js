const domready = require('domready');
const cheerio = require('cheerio');
const html2json = require('html2json').html2json;

xtag.register('s-svg', {
    lifecycle: {
        created: function(){
            const target = document.getElementById(this.getAttribute('target'));

            this.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" viewBox="-400 -300 800 600">' + this.innerHTML + '</svg>';

            xtag.addEvents(this, {
                'refresh': function(event){
                    console.log('i should refresh!', this.innerHTML);
                    const $ = cheerio.load(this.innerHTML, {
                        normalizeWhitespace: true,
                        xmlMode: true
                    });

                    $('*').each(function(){
                        console.log('><' + this.name);
                        if (this.name.indexOf('-') > -1) {
                            this.tagName = 'g';
                            this.attribs = {};
                        }
                    });

                    const result = $.html().split('<g>').join('').split('</g>').join('');

                    target.innerHTML = result;
                }
            });
        }
    }
});

xtag.register('s-circle', {
    lifecycle: {
        created: function(){
            this.innerHTML = '<circle cx="'+(this.getAttribute('x') || 0)+'" cy="'+(this.getAttribute('y') || 0)+'" r="'+(this.getAttribute('radius') || 10)+'" >'+this.innerHTML+'</circle>';
        },
        inserted: function(){
            xtag.fireEvent(this.parentNode, 'refresh', {
                detail: {}
            });
        }
    }
});

xtag.register('s-copy', {
    lifecycle: {
        created: function(){
            const master = cheerio.load(this.innerHTML, {
                normalizeWhitespace: true,
                xmlMode: true
            });

            let result = '';

            ([0, 40, 80]).forEach(function(size) {
                master('*').attr('x', size);
                result += master.html();
            });

            this.innerHTML = result;

            xtag.addEvents(this, {
                'refresh': function(event){
                    xtag.fireEvent(this.parentNode, 'refresh', {
                        detail: {}
                    });
                }
            });
        },
        inserted: function(){
            xtag.fireEvent(this.parentNode, 'refresh', {
                detail: {}
            });
        }
    }
});

xtag.register('st-story', {
    lifecycle: {
        created: function(){
            // console.log('here is a story: ', html2json(this.innerHTML));
        }
    }
});

xtag.register('st-travel', {
    lifecycle: {
        created: function(){
            const travelNode = html2json(this.outerHTML).child[0];
            const startCity = travelNode.attr.start;

            const cities = [];
            const roads = [];

            travelNode.child.filter(function(child) {
                return child.node == 'element' && child.tag == 'st-city';
            }).forEach(function(cityNode) {
                cities.push({
                    name: cityNode.attr.name,
                    x: cityNode.attr.x,
                    y: cityNode.attr.y
                });

                cityNode.child.filter(function(child) {
                    return child.node == 'element' && child.tag == 'st-road';
                }).forEach(function(roadNode) {
                    roads.push({
                        from: cityNode.attr.name,
                        to: roadNode.attr.city
                    });
                });
            });

            this.state = {
                currentCity: startCity,
                cities: cities,
                roads: roads
            };

        },
        inserted: function(){
            const state = this.state;

            const Component = {
                view: function() {
                    const cityRadius = 64;
                    const mapBorder = 32;

                    const toInt = function(value) {
                        return parseInt(value);
                    }

                    const xPositions = _.pluck(state.cities, 'x').map(toInt);
                    const yPositions = _.pluck(state.cities, 'y').map(toInt);

                    const xMin = _.min(xPositions) - cityRadius;
                    const xMax = _.max(xPositions) + cityRadius;
                    const xWidth = xMax - xMin + mapBorder * 2;
                    const xOffset = xMin + cityRadius - mapBorder;

                    const yMin = _.min(yPositions) - cityRadius;
                    const yMax = _.max(yPositions) + cityRadius;
                    const yWidth = yMax - yMin + mapBorder * 2;
                    const yOffset = yMin + cityRadius - mapBorder;

                    return m('travel',
                        [
                            m('h1', 'traveller'),
                            m('div', {
                                style: {
                                    position: 'relative',
                                    width: xWidth + 'px',
                                    height: yWidth + 'px',
                                    border: '1px solid blue'
                                }
                            }, state.cities.map(function(city) {
                                if (state.currentCity == city.name) {
                                    return m('div', {
                                        style: {
                                            position: 'absolute',
                                            left: (city.x - xOffset) + 'px',
                                            top: (city.y - yOffset) + 'px',
                                            width: cityRadius * 2 + 'px',
                                            height: cityRadius * 2 + 'px',
                                            border: '1px solid green',
                                            'border-radius': cityRadius + 'px',
                                            'text-align': 'center'
                                        }
                                    }, [
                                        m('div', city.name),
                                        m('div', state.roads.filter(function(road) { return road.from == state.currentCity }).map(function(road) {
                                            return m('button', {
                                                onclick: function() {
                                                    state.currentCity = road.to;
                                                }
                                            }, road.to);
                                        }))
                                    ])
                                }

                                return m('div', {
                                    style: {
                                        position: 'absolute',
                                        left: (city.x - xOffset) + 'px',
                                        top: (city.y - yOffset) + 'px',
                                        width: cityRadius * 2 + 'px',
                                        height: cityRadius * 2 + 'px',
                                        border: '1px solid grey',
                                        'border-radius': cityRadius + 'px',
                                        'text-align': 'center'
                                    }
                                }, city.name)
                            })
                          )
                      ]
                    )
                }
            };

            m.mount(this, Component)
        }
    }
});

domready(function () {

})
