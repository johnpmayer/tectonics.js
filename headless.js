
// Awful awful hack since the tectonic isn't build with modern JS idioms (it was never intended for pluggability)

var fs = require("fs");

function read(f) {
  var raw = fs.readFileSync(f).toString();
  return raw.replace(/['"]use strict['"];/g, '');
}

// Set some variables which are accessed in the "imported" scripts

var self = {};
var window = {};

// Import most (but not all, notably skipping most rendering code)
// by copying what's in index.html

// eval(read("libraries/vue.js")
// eval(read("libraries/Chart.js")
// eval(read("libraries/vue-charts.js")
// eval(read("libraries/jquery-1.10.2.min.js")
// eval(read("libraries/bootstrap.js")
eval(read("libraries/three.js/Three.js"))
eval(read("libraries/three.js/Detector.js"))
eval(read("libraries/three.js/Stats.js"))
eval(read("libraries/three.js/OrbitControls.js"))
eval(read("libraries/three.js/BufferGeometryUtils.js"))
// eval(read("libraries/threex/THREEx.screenshot.js"))
// eval(read("libraries/threex/THREEx.FullScreen.js"))
// eval(read("libraries/threex/THREEx.WindowResize.js"))
// <!-- eval(read("libraries/threex/THREEx.QuickHull.js")) -->
eval(read("libraries/threex/THREEx.Debug.js"))
eval(read("libraries/random-0.26.js"))
eval(read("libraries/base64-arraybuffer.js"))
// eval(read("postcompiled/Shaders.js"))
eval(read("postcompiled/Rasters.js"))
eval(read("noncompiled/Units.js"))
eval(read("noncompiled/Interpolation.js"))
eval(read("noncompiled/Logging.js"))
eval(read("noncompiled/academics/SphericalGeometry.js"))
eval(read("noncompiled/academics/Optics.js"))
eval(read("noncompiled/academics/Thermodynamics.js"))
eval(read("noncompiled/academics/FluidMechanics.js"))
eval(read("noncompiled/academics/OrbitalMechanics.js"))
eval(read("noncompiled/academics/Tectonophysics.js"))
eval(read("noncompiled/academics/Hydrology.js"))
eval(read("noncompiled/academics/Climatology.js"))
eval(read("noncompiled/academics/PlantBiology.js"))
eval(read("noncompiled/models/Memo.js"))
eval(read("noncompiled/models/universe/Orbit.js"))
eval(read("noncompiled/models/universe/Spin.js"))
eval(read("noncompiled/models/universe/Star.js"))
eval(read("noncompiled/models/universe/System.js"))
eval(read("noncompiled/models/universe/Universe.js"))
eval(read("noncompiled/models/lithosphere/Crust.js"))
eval(read("noncompiled/models/lithosphere/RockColumn.js"))
eval(read("noncompiled/models/lithosphere/Plate.js"))
eval(read("noncompiled/models/lithosphere/SupercontinentCycle.js"))
eval(read("noncompiled/models/lithosphere/Lithosphere.js"))
eval(read("noncompiled/models/hydrosphere/Hydrosphere.js"))
eval(read("noncompiled/models/atmosphere/Atmosphere.js"))
eval(read("noncompiled/models/biosphere/Biosphere.js"))
eval(read("noncompiled/models/World.js"))
eval(read("noncompiled/models/Simulation.js")) 
eval(read("noncompiled/generators/CrustGenerator.js"))
eval(read("noncompiled/generators/NameGenerator.js"))
eval(read("noncompiled/generators/NameCorpii.js"))
eval(read("noncompiled/file-io/JsonSerializer.js"))
eval(read("noncompiled/file-io/CsvExporter.js"))
// eval(read("noncompiled/views/raster-views/PdfChartRasterView.js"))
// eval(read("noncompiled/views/raster-views/ColorscaleRasterView.js"))
// eval(read("noncompiled/views/raster-views/HeatmapRasterView.js"))
// eval(read("noncompiled/views/raster-views/TopographicRasterView.js"))
// eval(read("noncompiled/views/raster-views/DisabledVectorRasterView.js"))
// eval(read("noncompiled/views/raster-views/VectorRasterView.js"))
// eval(read("noncompiled/views/world-views/RealisticWorldView.js"))
// eval(read("noncompiled/views/world-views/ScalarWorldView.js"))
// eval(read("noncompiled/views/world-views/VectorWorldView.js"))
// eval(read("noncompiled/views/projection-views/MapProjectionView.js"))
// eval(read("noncompiled/views/projection-views/GlobeProjectionView.js"))
// eval(read("noncompiled/views/ScalarViews.js"))
// eval(read("noncompiled/views/VectorViews.js"))
// eval(read("noncompiled/views/ProjectionViews.js"))
// eval(read("noncompiled/views/RegressionTestViews.js"))
// eval(read("noncompiled/views/ExperimentalViews.js"))
// <!-- eval(read("noncompiled/views/TestViews.js")) -->
eval(read("noncompiled/views/View.js"))

// Begin main routine:

function simulate() {
	
	// Simplified constants
	
	var resolution = 6;
	var seed = (new Date).getTime().toString();
	var speed = (1e6*Units.YEAR).toString();
	
	var sim = new Simulation({
		seed: seed,
		speed: speed,
	});
	
	// var star_name_corpus = NameGenerator.tokenize_corpus(NameCorpii.arabic_star_names);
	// var get_star_name = NameGenerator.get_length_distribution_generator(star_name_corpus, 25, {5:1,6:3,7:11,8:3,9:1}, 100);
	
	// var planet_name_corpus = NameGenerator.tokenize_corpus(NameCorpii.greek_mythological_names);
	// var get_planet_name = NameGenerator.get_length_distribution_generator(planet_name_corpus, 25, {5:1,6:3,7:11,8:3,9:1}, 100);
	// var focus_name = get_planet_name(sim.random);
	
	var star_name = 'SOL';
	var planet_name = 'TERRA';
	
	console.log("Setting up Universe")
	
	var geometry = new THREE.IcosahedronGeometry(1, resolution);
	var universe = new Universe({
		system: {
			name: 'galactic orbit',
			motion: { // motion mirrors orbit of sun around galactic center
				type: 'orbit',
				semi_major_axis: 2.35e20, // meters
				effective_combined_mass: 1.262e41, // kg, back calculated to achieve period of 250 million years
			},
			invariant_insolation: true,
			body: {
				type: 'star',
				name: star_name,
				mass: Units.SOLAR_MASS,
			},
			children: [
				{
					name: 'orbit',
					motion: {
						type: 'orbit',
						semi_major_axis: 1. * Units.ASTRONOMICAL_UNIT,
						eccentricity: 0.0167,
						inclination: Math.PI * 5e-5/180,
						longitude_of_ascending_node: Math.PI * -11/180,
						effective_combined_mass: 2e30, // kg
					},	
					children: [
						{
							name: 'precession',
							motion: { 
								type: 'spin',
								angular_speed: 2*Math.PI/(25860 * Units.YEAR),
							},	
							invariant_insolation: true,
							children: [
								{
									name: 'spin',
									motion: { 
										type: 'spin',
										angular_speed: 2*Math.PI/(60*60*24),
										axial_tilt: Math.PI * 23.5/180,
									},	
									body: { 
										type: 'world',
										name: planet_name,
										grid: {
											faces:   geometry.faces.map(f => { 
												return {a: f.a, b: f.b, c: f.c, vertexNormals: f.vertexNormals} 
												}),
											vertices:geometry.vertices.map(v => { 
												return {x: v.x, y: v.y, z: v.z} 
												}),
										},
									},
								},
							],
						},
					],
				},
			],
		},
	});
	
	console.log("Generating crust");
	
	var focus = universe.body_id_to_node_map[planet_name].body;
	CrustGenerator.generate(
		SphericalGeometry.get_random_surface_field(focus.grid, sim.random), 
		CrustGenerator.modern_earth_hypsography, 
		CrustGenerator.modern_earth_attribute_height_maps, 
		focus.lithosphere.total_crust,
		sim.random
	);
	
	console.log("Initializing model");
	universe.initialize();
	
	console.log("Model ready:", universe);
	
	var constantTimestep = speed * 0.1;
	var steps = 50;
	var logPeriod = 10;
	
	for (var i = 1; i <= steps; i += 1) {
		if (i % logPeriod == 0) {
			console.log("Step", i)
		}
		
		universe.invalidate();
		universe.calcChanges(constantTimestep);
		universe.applyChanges(constantTimestep);
	}
	
	console.log("Model finished");

}

simulate()