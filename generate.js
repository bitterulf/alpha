const fs = require('fs');
const json2html = require('html2json').json2html;
const beautify_html = require('js-beautify').html;

const map = require('./map.json');

const cities = [];
const roads = [];

map
    .layers
    .filter(function(layer) { return layer.type == 'objectgroup'})
    .forEach(function(layer) {
        layer.objects.forEach(function(obj) {
            if (obj.ellipse) {
                cities.push({
                    name: obj.name,
                    x: obj.x,
                    y: obj.y
                });
            }
        });
    });

const dist = function(a, b) {
    const x = a.x - b.x;
    const y = a.y - b.y;

    return Math.sqrt( x*x + y*y );
};

map
    .layers
    .filter(function(layer) { return layer.type == 'objectgroup'})
    .forEach(function(layer) {
        layer.objects.forEach(function(obj) {
            if(obj.polyline) {
                const line = obj.polyline.map(function(point) {
                    return {
                        x: obj.x + point.x,
                        y: obj.y + point.y
                    };
                });

                let startCity;

                cities.forEach(function(city) {
                    if (!startCity || dist(line[0], city)  < dist(line[0], startCity)) {
                        startCity = city;
                    }
                });

                let endCity;

                cities.forEach(function(city) {
                    if (!endCity || dist(line[line.length-1], city)  < dist(line[line.length-1], endCity)) {
                        endCity = city;
                    }
                });

                line[0] = { x: startCity.x , y: startCity.y };
                line[line.length-1] = { x: endCity.x , y: endCity.y };

                console.log('poly', line);

                roads.push({
                    from: startCity.name,
                    to: endCity.name,
                    path: line
                });
            }
        });
    });

const backgrounds = [];
map
    .layers
    .filter(function(layer) { return layer.type == 'imagelayer'})
    .forEach(function(layer) {
        backgrounds.push({
            image: layer.image,
            width: layer.width * map.tilewidth,
            height: layer.height * map.tileheight,
            x: layer.x,
            y: layer.y
        });
    });

let childElements = [];

childElements = childElements.concat(
    backgrounds.map(function(background) {
        return {
            "node":"element",
            "tag":"game-background",
            "attr":{
                "image": background.image,
                "width": background.width,
                "height": background.height,
                "x": background.x,
                "y": background.y
            }
        };
    })
);

childElements = childElements.concat(
    cities.map(function(city) {
        return {
            "node":"element",
            "tag":"game-city",
            "attr":{
                "name": city.name,
                "x": city.x,
                "y": city.y
            }
        };
    })
);

childElements = childElements.concat(
    roads.map(function(road) {
        return {
            "node":"element",
            "tag":"game-road",
            "attr":{
                "from": road.from,
                "to": road.to
            },
            "child": road.path.map(function(point) {
                return {
                    "node":"element",
                    "tag":"game-point",
                    "attr":{
                        "x": point.x,
                        "y": point.y
                    }
                };
            })
        };
    })
);

const exampleStructure = {
    "node":"root",
    "child":[
        {
            "node":"element",
            "tag":"game-map",
            "attr":{
                "start": cities[0].name,
                "width": map.width * map.tilewidth / 2,
                "height": map.height * map.tileheight / 2
            },
            "child": childElements
        }
    ]
};

const testResult = json2html(exampleStructure);

fs.writeFileSync('./output.html', beautify_html(testResult));
