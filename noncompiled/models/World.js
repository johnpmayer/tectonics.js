'use strict';



function World(parameters) {
	var this_ = this;
	this.name = parameters.name;
	this.grid = new Grid(parameters['grid']) || stop('missing parameter: "grid"');

	// all heat capacities in Joules per Kelvin
	this.material_heat_capacity = parameters['material_heat_capacity'] || {
	    ocean  : 30e7, 	// heat capacity of 1m^2 of 75m water column, the ocean's "mixing layer"
	    felsic : 1e7, 	// heat capacity of 1m^2 air column on earth
	    air : 1e7, 	// heat capacity of 1m^2 air column on earth
	}

	// all viscosities in m/s per Pascal
	this.material_viscosity = parameters['material_viscosity'] || {
		mantle: 1.57e20, 
	};

	// all densities in kg/m^3
	this.material_density = parameters['material_density'] || {
		// most values are estimates from looking around wolfram alpha
		fine_sediment: 1500.,
		coarse_sediment: 1500.,
		sediment: 1500.,
		sedimentary: 2600.,
		metamorphic: 2800.,
		felsic_plutonic: 2600.,
		felsic_volcanic: 2600.,
		mafic_volcanic_min: 2890., // Carlson & Raskin 1984
		mafic_volcanic_max: 3300.,
		mantle: 3075., // derived empirically using isostatic model
		ocean: 1026.,
	};

	this.material_reflectivity = parameters['material_reflectivity'] || {
	    ocean:  	0.06,
	    felsic:  	0.27,
	    forest:  	0.1,
	    ice:  		0.8,
	};

	this.surface_gravity = parameters['surface_gravity'] || (9.8 * Units.METER / (Units.SECOND*Units.SECOND)); // m/s^2

	this.radius = parameters['radius'] || Units.EARTH_RADIUS; // meters

	this.age = parameters['age'] || 0; // megayears

	this.lithosphere 	= new Lithosphere	(this.grid, parameters.lithosphere	|| {});
	this.hydrosphere 	= new Hydrosphere	(this.grid, parameters.hydrosphere	|| {});
	this.atmosphere 	= new Atmosphere	(this.grid, parameters.atmosphere 	|| {});
	this.biosphere 		= new Biosphere		(this.grid, parameters.biosphere 	|| {});


	this.getParameters = function() {
		return { 
			type: 					'world',
			grid: 					this.grid.getParameters(),
			name: 					this.name,
			material_heat_capacity: this.material_heat_capacity,
			material_viscosity: 	this.material_viscosity,
			material_density: 		this.material_density,
			material_reflectivity: 	this.material_reflectivity,
			surface_gravity: 		this.surface_gravity,
			radius: 				this.radius,
			age: 					this.age,
			lithosphere: 			this.lithosphere.getParameters(),
			hydrosphere: 			this.hydrosphere.getParameters(),
			atmosphere: 			this.atmosphere.getParameters(),
			biosphere: 				this.biosphere.getParameters(),
		};
	}


	this.setDependencies = function(dependencies) {
		if (dependencies['get_average_insolation'] !== void 0) {
			this.atmosphere.setDependencies(
				{'get_average_insolation': dependencies.get_average_insolation}
			);
			this.biosphere.setDependencies(
				{'get_average_insolation': dependencies.get_average_insolation}
			);
			this.hydrosphere.setDependencies(
				{'get_average_insolation': dependencies.get_average_insolation}
			);
		}
		if (dependencies['angular_speed'] !== void 0) {
			this.atmosphere.setDependencies(
				{'angular_speed': dependencies.angular_speed}
			);
		}
	};

	this.initialize = function() {
		this.lithosphere.setDependencies({
			'surface_gravity'		: this.surface_gravity,
			'sealevel'				: this.hydrosphere.sealevel,
			'material_density'		: this.material_density,
			'material_viscosity'	: this.material_viscosity,
		});
		this.hydrosphere.setDependencies({
			'surface_temp'			: this.atmosphere.surface_temp,
			'displacement'			: this.lithosphere.displacement,
			'material_density'		: this.material_density,
		});
		this.atmosphere.setDependencies({
			'material_heat_capacity': this.material_heat_capacity,
			'material_reflectivity'	: this.material_reflectivity,
			'surface_height' 		: this.lithosphere.surface_height,
			'ice_coverage' 			: this.hydrosphere.ice_coverage,
			'ocean_coverage'		: this.hydrosphere.ocean_coverage,
			'plant_coverage'		: this.biosphere.plant_coverage,
		});
		this.biosphere.setDependencies({
			'long_term_surface_temp'	: this.atmosphere.long_term_surface_temp,
			'precipitation'		: this.atmosphere.precipitation,
		});

		// WARNING: order matters! (sorry, I'm working on it!)
		this.lithosphere.initialize();
		this.hydrosphere.initialize();
		this.atmosphere.initialize();
		this.biosphere.initialize();
	}

	this.invalidate = function() {
		this.lithosphere.invalidate();
		this.hydrosphere.invalidate();
		this.atmosphere.invalidate();
		this.biosphere.invalidate();
	}

	this.calcChanges = function(timestep) {
		if (timestep === 0) {
			return;
		};

		// TODO: switch all submodels to record time in seconds
		this.lithosphere.calcChanges(timestep);
		this.hydrosphere.calcChanges(timestep);
		this.atmosphere.calcChanges(timestep);
		this.biosphere.calcChanges(timestep);
	};

	this.applyChanges = function(timestep) {
		if (timestep === 0) {
			return;
		};

		this.lithosphere.applyChanges(timestep);
		this.hydrosphere.applyChanges(timestep);
		this.atmosphere.applyChanges(timestep);
		this.biosphere.applyChanges(timestep);
	};
	return this;
}