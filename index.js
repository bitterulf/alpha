const domready = require('domready');
const cheerio = require('cheerio');
const html2json = require('html2json').html2json;
const json2html = require('html2json').json2html;

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

xtag.register('game-map', {
    lifecycle: {
        created: function(){
            const travelNode = html2json(this.outerHTML).child[0];
            const startCity = travelNode.attr.start;

            const backgrounds = [];
            const cities = [];
            const roads = [];

            travelNode.child.filter(function(child) {
                return child.node == 'element' && child.tag == 'game-city';
            }).forEach(function(cityNode) {
                cities.push({
                    name: cityNode.attr.name,
                    x: cityNode.attr.x,
                    y: cityNode.attr.y
                });
            });

            travelNode.child.filter(function(child) {
                return child.node == 'element' && child.tag == 'game-road';
            }).forEach(function(roadNode) {
                const path = roadNode.child.filter(function(child) {
                    return child.node == 'element' && child.tag == 'game-point';
                }).map(function(node) {
                    return {
                        x: parseInt(node.attr.x),
                        y: parseInt(node.attr.y)
                    };
                });

                roads.push({
                    from: roadNode.attr.from,
                    to: roadNode.attr.to,
                    path: path
                });

                roads.push({
                    from: roadNode.attr.to,
                    to: roadNode.attr.from,
                    path: JSON.parse(JSON.stringify(path)).reverse()
                });
            });

            travelNode.child.filter(function(child) {
                return child.node == 'element' && child.tag == 'game-background';
            }).forEach(function(backgroundNode) {
                backgrounds.push({
                    image: backgroundNode.attr.image,
                    width: backgroundNode.attr.width,
                    height: backgroundNode.attr.height,
                    x: backgroundNode.attr.x,
                    y: backgroundNode.attr.y
                });
            });

            this.state = {
                idle: true,
                currentCity: startCity,
                currentAnimation: '',
                currentViewAnimation: '',
                backgrounds: backgrounds,
                cities: cities,
                roads: roads
            };

        },
        inserted: function(){
            const state = this.state;

            const Component = {
                view: function() {
                    const cityRadius = 32;
                    const mapBorder = 32;

                    const toInt = function(value) {
                        return parseInt(value);
                    }

                    const xPositions = _.pluck(state.cities, 'x').map(toInt);
                    const yPositions = _.pluck(state.cities, 'y').map(toInt);

                    const xMin = _.min(xPositions) - cityRadius;
                    const xMax = _.max(xPositions) + cityRadius;
                    const xWidth = xMax - xMin;
                    const xOffset = xMin;

                    const yMin = _.min(yPositions) - cityRadius;
                    const yMax = _.max(yPositions) + cityRadius;
                    const yWidth = yMax - yMin;
                    const yOffset = yMin;

                    const cityByName = {};
                    state.cities.forEach(function(city) {
                        cityByName[city.name] = city;
                    });

                    const dist = function(a, b) {
                        const x = a.x - b.x;
                        const y = a.y - b.y;

                        return Math.sqrt( x*x + y*y );
                    };

                    const convertPath = function(rawPath) {
                        let distance = 0;
                        let lastPoint;

                        let path = rawPath.map(function(point, index) {
                            if (lastPoint) {
                                distance += dist(lastPoint, point);
                            }
                            point.rawDistance = distance;
                            lastPoint = point;
                            return point;
                        });

                        return path.map(function(point) {
                            point.distance = Math.round(point.rawDistance / distance * 1000)/10;
                            return point;
                        })
                    };

                    const roadPaths = state.roads.map(function(road) {
                        const path = convertPath(road.path).map(function(point) {
                            return ' '+point.distance+'%   { animation-timing-function: linear; left: '+point.x+'px; top: '+point.y+'px;}'
                        });

                        const fromCity = cityByName[road.from];
                        const toCity = cityByName[road.to];
                        fromCity.x = parseInt(fromCity.x);
                        fromCity.y = parseInt(fromCity.y);
                        toCity.x = parseInt(toCity.x);
                        toCity.y = parseInt(toCity.y);

                        return '@keyframes '+road.from+'_'+road.to+' { '+path.join(' ')+' }';
                    });

                    const roadViewPaths = state.roads.map(function(road) {
                        const path = convertPath(road.path).map(function(point) {

                            return ' '+point.distance+'%   { animation-timing-function: linear; left: '+((point.x - xWidth/2) * -1)+'px; top: '+((point.y - yWidth/2) * -1)+'px;}'
                        });

                        const fromCity = cityByName[road.from];
                        const toCity = cityByName[road.to];
                        fromCity.x = parseInt(fromCity.x);
                        fromCity.y = parseInt(fromCity.y);
                        toCity.x = parseInt(toCity.x);
                        toCity.y = parseInt(toCity.y);

                        return '@keyframes '+road.from+'_'+road.to+'_view { '+path.join(' ')+' }';
                    });

                    const currentCity = cityByName[state.currentCity];

                    return m('div.travel',
                            {
                                style: {
                                    position: 'relative',
                                    top: '0px',
                                    left: '0px',
                                    width: xWidth + 'px',
                                    height: yWidth + 'px',
                                    overflow: 'hidden'
                                }
                            },
                            [
                                m('style', roadPaths.join(' ')),
                                m('style', roadViewPaths.join(' ')),
                                m('h1', 'traveller'),
                                m('div.mainOffset', {
                                    style: {
                                        position: 'absolute',
                                        top: (currentCity.y - yWidth/2) * -1 + 'px',
                                        left: (currentCity.x - xWidth/2) * -1 + 'px',
                                        animation: state.currentViewAnimation
                                    }
                                },
                                [
                                    m('div.backgrounds', state.backgrounds.map(function(background) {
                                        return m('div.background', {
                                            style: {
                                                backgroundImage: 'url("map.png")',
                                                position: 'absolute',
                                                left: background.x + 'px',
                                                top: background.y + 'px',
                                                width: background.width + 'px',
                                                height: background.height + 'px'
                                            }
                                        });
                                    })),
                                    m('div.cities', state.cities.map(function(city) {
                                        if (state.currentCity == city.name) {
                                        }

                                        return m('div',
                                             {
                                                style: {
                                                    position: 'absolute',
                                                    left: (city.x) + 'px',
                                                    top: (city.y) + 'px'
                                                }
                                            }, m('div', {
                                                style: {
                                                    position: 'relative',
                                                    left: cityRadius * -1 + 'px',
                                                    top: cityRadius * -1 + 'px',
                                                    width: cityRadius * 2 + 'px',
                                                    height: cityRadius * 2 + 'px',
                                                    border: '1px solid grey',
                                                    'text-align': 'center'
                                                }
                                            }, city.name)
                                        );
                                    })),
                                    m('div.playerAnimation', {
                                        style: {
                                            position: 'absolute',
                                            top: currentCity.y+'px',
                                            left: currentCity.x+'px',
                                            animation: state.currentAnimation
                                        }
                                    }, [
                                        m('div.player', {
                                            style: {
                                                position: 'relative',
                                                left: cityRadius * -1 + 'px',
                                                top: cityRadius * -1 + 'px',
                                                width: cityRadius * 2 + 'px',
                                                height: cityRadius * 2 + 'px',
                                                'border-radius': cityRadius * 2 + 'px',
                                                border: '1px solid green',
                                                'background-color': 'lightgreen',
                                                'text-align': 'center'
                                            }
                                        }, [
                                            m('div.roads', state.roads.filter(function(road) { return road.from == state.currentCity }).map(function(road) {
                                                if (!state.idle) {
                                                    return '';
                                                }

                                                return m('button', {
                                                    onclick: function() {
                                                        const distance = road.path[road.path.length - 1].rawDistance;
                                                        const time = parseInt(distance * 10);
                                                        console.log('MIME', time);
                                                        state.idle = false;
                                                        state.currentAnimation = road.from+'_'+road.to+'  '+time+'ms forwards';
                                                        state.currentViewAnimation = road.from+'_'+road.to+'_view  '+time+'ms forwards';
                                                        state.currentCity = road.to;
                                                        window.setTimeout(function() {
                                                            state.idle = true;
                                                            m.redraw();
                                                        }, time);
                                                    }
                                                }, road.to);
                                            }))
                                        ])
                                    ])
                                ])
                            ]
                    )
                }
            };

            m.mount(this, Component)
        }
    }
});
