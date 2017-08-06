const forEachElement = function(travelNode, tag, cb) {
    travelNode.child.filter(function(child) {
        return child.node == 'element' && child.tag == tag;
    }).forEach(cb);
};

module.exports = {
    extractCities: function(travelNode) {
        const cities = [];

        forEachElement(travelNode, 'game-city', function(cityNode) {
            cities.push({
                name: cityNode.attr.name,
                x: cityNode.attr.x,
                y: cityNode.attr.y
            });
        });

        return cities;
    },

    extractRoads: function(travelNode) {
        const roads = [];

        forEachElement(travelNode, 'game-road', function(roadNode) {
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

        return roads;
    },

    extractAreas: function(travelNode) {
        const areas = [];

        forEachElement(travelNode, 'game-area', function(roadNode) {
            const path = roadNode.child.filter(function(child) {
                return child.node == 'element' && child.tag == 'game-point';
            }).map(function(node) {
                return {
                    x: parseInt(node.attr.x),
                    y: parseInt(node.attr.y)
                };
            });

            areas.push({
                name: roadNode.attr.name,
                path: path
            });
        });

        return areas;
    },

    extractBackgrounds: function(travelNode) {
        const backgrounds = [];

        forEachElement(travelNode, 'game-background', function(backgroundNode) {
            backgrounds.push({
                image: backgroundNode.attr.image,
                width: backgroundNode.attr.width,
                height: backgroundNode.attr.height,
                x: backgroundNode.attr.x,
                y: backgroundNode.attr.y
            });
        });

        return backgrounds;
    }
};
