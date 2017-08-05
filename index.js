const domready = require('domready');
const cheerio = require('cheerio');
const html2json = require('html2json').html2json;
const json2html = require('html2json').json2html;
const extractor = require('./modules/extractor.js');

xtag.register('game-map', {
    lifecycle: {
        created: function(){
            const travelNode = html2json(this.outerHTML).child[0];
            const startCity = travelNode.attr.start;

            const backgrounds = extractor.extractBackgrounds(travelNode);
            const cities = extractor.extractCities(travelNode);
            const roads = extractor.extractRoads(travelNode);

            this.state = {
                width: travelNode.attr.width,
                height: travelNode.attr.height,
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
                                m('h1', 'traveller'),
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
