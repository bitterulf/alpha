const domready = require('domready');
const cheerio = require('cheerio');
const html2json = require('html2json').html2json;
const json2html = require('html2json').json2html;
const inside = require('point-in-polygon');
const extractor = require('./modules/extractor.js');

xtag.register('game-map', {
    lifecycle: {
        created: function(){
            const travelNode = html2json(this.outerHTML).child[0];
            const startCity = travelNode.attr.start;

            const backgrounds = extractor.extractBackgrounds(travelNode);
            let cities = extractor.extractCities(travelNode);
            let roads = extractor.extractRoads(travelNode);
            const areas = extractor.extractAreas(travelNode);

            roads = roads.map(function(road) {
                road.path = road.path.map(function(point) {
                    areas.forEach(function(area) {
                        if (inside([point.x, point.y], area.path.map(function(p){ return [p.x, p.y]}))) {
                            point.zone = area.name;
                        }
                    });

                    return point;
                });

                return road
            });

            cities = cities.map(function(city) {

                areas.forEach(function(area) {
                    if (inside([city.x, city.y], area.path.map(function(p){ return [p.x, p.y]}))) {
                        city.zone = area.name;
                    }
                });

                return city
            });

            let zone = '';

            cities.forEach(function(city) {
                if (city.name == startCity) {
                    zone = city.zone;
                }
            });

            this.state = {
                width: travelNode.attr.width,
                height: travelNode.attr.height,
                idle: true,
                currentCity: startCity,
                currentAnimation: '',
                currentViewAnimation: '',
                backgrounds: backgrounds,
                cities: cities,
                roads: roads,
                zone: ''
            };

        },
        inserted: function(){
            const state = this.state;

            const Component = {
                view: function() {
                    const cityRadius = 20;
                    const playerRadius = 43;

                    const mapWidth = state.width;
                    const mapHeight = state.height;

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

                            return ' '+point.distance+'%   { animation-timing-function: linear; left: '+((point.x - mapWidth/2) * -1)+'px; top: '+((point.y - mapHeight/2) * -1)+'px;}'
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
                                    width: mapWidth + 'px',
                                    height: mapHeight + 'px',
                                    overflow: 'hidden'
                                }
                            },
                            [
                                m('style', roadPaths.join(' ')),
                                m('style', roadViewPaths.join(' ')),
                                m('style', '@keyframes fade { 0% { opacity: 1 } 100% { opacity: 0 } } @keyframes fadeIn { 0% { opacity: 0 } 100% { opacity: 1 } }'),
                                m('style', '@keyframes scaleOut { 0% { transform: scale(1.0) } 100% { transform: scale(0.5) } } @keyframes scaleIn { 0% { transform: scale(0.5) } 100% { transform: scale(1.0) } }'),
                                m('style', '@keyframes wave { 0%, 100% { top: 0px; transform: rotate(0deg); } 50% { top: 4px; transform: rotate(3deg); } }'),
                                m('div.mainOffset', {
                                    style: {
                                        position: 'absolute',
                                        top: (currentCity.y - mapHeight/2) * -1 + 'px',
                                        left: (currentCity.x - mapWidth/2) * -1 + 'px',
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
                                                title: city.name,
                                                style: {
                                                    position: 'relative',
                                                    left: cityRadius * -1 + 'px',
                                                    top: cityRadius * -1 + 'px',
                                                    width: cityRadius * 2 + 'px',
                                                    height: cityRadius * 2 + 'px',
                                                    'background-image': 'url("marker.png")',
                                                    'text-align': 'center',
                                                    animation: (state.currentCity == city.name) && state.idle ? 'scaleIn 1000ms forwards' : 'scaleOut 1000ms forwards'
                                                }
                                            })
                                        );
                                    })),
                                    m('div.playerAnimation', {
                                        style: {
                                            position: 'absolute',
                                            top: currentCity.y+'px',
                                            left: currentCity.x+'px',
                                            animation: state.currentAnimation
                                        }
                                    },
                                      m('div', {
                                            style: {
                                                position: 'relative',
                                                animation: 'wave 1000ms infinite'
                                            }
                                        },
                                        m('div.player', {
                                            style: {
                                                position: 'relative',
                                                left: playerRadius * -1 + 'px',
                                                top: playerRadius * -1.75 + 'px',
                                                width: playerRadius * 2 + 'px',
                                                height: playerRadius * 2 + 'px',
                                                'text-align': 'center',
                                                'background-image': 'url("ship.png")',
                                                animation: state.idle ? 'fade 1000ms forwards' : 'fadeIn 1000ms forwards'
                                            }
                                        })
                                      )
                                    )
                                ]),
                                m('div.zone', {style: {
                                    position: 'absolute',
                                    top: (mapHeight/4*2.5)+'px',
                                    left: '0px',
                                    width: mapWidth+'px',
                                    'text-align': 'center'
                                }}, [
                                    m('div', state.zone)
                                ]),
                                m('div.roads', {
                                    style: {
                                        position: 'absolute',
                                        top: (mapHeight/4*3)+'px',
                                        left: '0px',
                                        width: mapWidth+'px',
                                        'text-align': 'center'
                                    }
                                }, state.roads.filter(function(road) { return road.from == state.currentCity }).map(function(road) {
                                    if (!state.idle) {
                                        return '';
                                    }

                                    return m('button', {
                                        onclick: function() {
                                            const distance = road.path[road.path.length - 1].rawDistance;

                                            road.path.forEach(function(point){
                                                const time = Math.round(point.rawDistance * 10);

                                                window.setTimeout(function() {
                                                    state.zone = point.zone;
                                                    m.redraw();
                                                }, time);
                                            });

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
                            ]
                    )
                }
            };

            m.mount(this, Component)
        }
    }
});
