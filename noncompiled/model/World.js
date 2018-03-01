'use strict';

var World = (function() {
	function World(parameters) {
		this.grid = parameters['grid'] || stop('missing parameter: "grid"');

		this.getRandomPlateSpeed = parameters['getRandomPlateSpeed'] ||
			//function() { return Math.exp(random.normal(-5.13, 0.548)); }
			function() { return random.normal(0.00687, 0.00380); }
			//^^^ log normal and normal distribution fit to angular velocities from Larson et al. 1997

		this.supercontinentCycle = parameters['supercontinentCycle'] || new SupercontinentCycle(this, parameters);

		// The following are fields that are derived from other fields:
		this.displacement = Float32Raster(this.grid);
		// "displacement is the height of the crust relative to an arbitrary datum level
		// It is not called "elevation" to emphasize that it is not relative to sea level
		this.thickness = Float32Raster(this.grid);
		// the thickness of the crust in km
		this.density = Float32Raster(this.grid);
		// the average density of the crust, in kg/m^3

		this.plate_map = Uint8Raster(this.grid);
		this.plate_count = Uint8Raster(this.grid);
		this.asthenosphere_velocity = VectorRaster(this.grid);
		this.meanAnomaly = parameters['meanAnomaly'] || 0;

		// this.radius = parameters['radius'] || 6367;
		// this.age = parameters['age'] || 0;
		// this.maxPlatesNum = parameters['platesNum'] || 8;

		this.crust = new Crust({grid: this.grid});
		this.erosion = new Crust({grid: this.grid});
		this.accretion = new Crust({grid: this.grid});
		this.crust_delta = new Crust({grid: this.grid});
		this.crust_scratch = new Crust({grid: this.grid});

		this.plates = [];
	}

	function move_plates(plates, timestep) {
		for (var i=0, li=plates.length; i<li; ++i) {
	 		plates[i].move(timestep);
	 	}
	}
    // calculate derived properties for plates
	function update_calculated_plate_fields(plates, scratch) { 
		var plate_thickness = scratch || Float32Raster(plates[0].grid); 

	    var get_density = TectonicsModeling.get_density; 
	    var get_thickness = TectonicsModeling.get_thickness; 
	    
		var plate;
		for (var i=0, li=plates.length; i<li; ++i) {
		    plate = plates[i]; 
            get_thickness	(plate.crust, 															plate_thickness); 
            get_density		(plate.crust, plate_thickness,											plate.density); 
	 	}
	}
	// update fields that are derived from others
	function update_calculated_fields(world) {
		TectonicsModeling.get_thickness		(world.crust, 											world.thickness);
		TectonicsModeling.get_density 		(world.crust, world.thickness,							world.density);
		TectonicsModeling.get_displacement 	(world.thickness, world.density, world.mantleDensity, 	world.displacement);
	}
	function merge_plates_to_master(plates, master) {
	  	var scratchpad = RasterStackBuffer.scratchpad;
	  	scratchpad.allocate('merge_plates_to_master');

		var UINT8_NULL = 255;
		var UINT16_NULL = 65535;

		//WIPE MASTER RASTERS CLEAN
		Crust.reset(master.crust);
		Uint8Raster.fill(master.plate_map, UINT8_NULL);
		Uint8Raster.fill(master.plate_count, 0);

		
		var master_density = master.density; 
		Float32Raster.fill(master_density, 9999);

		//local variables
		var local_ids_of_global_cells; 

		//global variables
		var globalized_is_on_top = scratchpad.getUint8Raster(master.grid);
		var globalized_plate_mask = scratchpad.getUint8Raster(master.grid); 
		var global_ids_of_local_cells; 

		// float32array used for temporary storage of globalized scalar fields
		// this is used for performance reasons
		var globalized_scalar_field = scratchpad.getFloat32Raster(master.grid); 
		var plate_thickness = scratchpad.getFloat32Raster(master.grid); 

		var globalized_crust = master.crust_scratch;

		var fill_into = Uint8RasterGraphics.fill_into_selection;
		var copy_into = Float32RasterGraphics.copy_into_selection;
		var add_term = ScalarField.add_field_term;
		var add_ui8 = Uint8Field.add_field
		var resample_f32 = Float32Raster.get_ids;
		var resample_ui8 = Uint8Raster.get_ids;
		var and = BinaryMorphology.intersection;
		var lt = ScalarField.lt_field;

		var resample_crust = Crust.get_ids;

		var overlap_crust = TectonicsModeling.overlap_crust; 

	  	var plate; 
		Uint8Raster.fill(globalized_is_on_top, 1);
		for (var i=0, li=plates.length; i<li; ++i) {
		    plate = plates[i]; 

	    	local_ids_of_global_cells = plate.local_ids_of_global_cells;
	    	global_ids_of_local_cells = plate.global_ids_of_local_cells;

	    	// generate globalized_plate_mask
	    	// this raster indicates whether the plate exists in a region of the planet
	    	// this raster will be used when merging other rasters
		    resample_ui8(plate.mask, local_ids_of_global_cells, 										globalized_plate_mask); 

		    // generate globalized_is_on_top
		    // this raster indicates whether the plate is viewable from space
		    // this raster will be used when merging other fields
		    resample_f32(plate.density,		 		local_ids_of_global_cells, 							globalized_scalar_field);
		    lt 			(globalized_scalar_field,	master_density,										globalized_is_on_top);
		    and 		(globalized_is_on_top,		globalized_plate_mask,	 							globalized_is_on_top);
		    copy_into 	(master_density,	 		globalized_scalar_field, globalized_is_on_top, 		master_density);

		    // merge plates with master
		    // set plate_mask to current plate's index where current plate is on top
		    fill_into 	(master.plate_map, i, globalized_is_on_top, 									master.plate_map);
		    
		    // add 1 to master.plate_count where current plate exists
		    add_ui8 	(master.plate_count, globalized_plate_mask, 									master.plate_count);

		    resample_crust(plate.crust, local_ids_of_global_cells, 										globalized_crust);
		    overlap_crust (master.crust, globalized_crust, globalized_plate_mask, globalized_is_on_top, master.crust);
		}
	  	scratchpad.deallocate('merge_plates_to_master');
	}

	function rift(world, plates) { 
	  	var plate_map = world.plate_map;
	  	var ocean = world.ocean;
	  	var grid = world.grid;

	  	var scratchpad = RasterStackBuffer.scratchpad;
	  	scratchpad.allocate('rift');

	  	//rifting/detaching variables
		var localized_is_riftable = scratchpad.getUint8Raster(grid);
		var localized_will_stay_riftable = scratchpad.getUint8Raster(grid);
		var localized_is_just_outside_border = scratchpad.getUint8Raster(grid);
		var localized_is_rifting = scratchpad.getUint8Raster(grid);

		//global rifting/detaching variables
		var globalized_is_empty = scratchpad.getUint8Raster(grid);
		var globalized_is_alone = scratchpad.getUint8Raster(grid);
		var globalized_is_riftable = scratchpad.getUint8Raster(grid);
		var globalized_is_on_top = scratchpad.getUint8Raster(grid);

		var scratch_ui8 = scratchpad.getUint8Raster(grid);

		var resample = Uint8Raster.get_ids;
		var margin = BinaryMorphology.margin;
		var or = BinaryMorphology.union;
		var and = BinaryMorphology.intersection;
		var erode = BinaryMorphology.erosion;
		var equals = Uint8Field.eq_scalar;
		var fill_into = Uint8RasterGraphics.fill_into_selection;
		var fill_into_crust = Crust.fill_into_selection;

		//		 op 	operands														result
		equals 	(world.plate_count, 0, 													globalized_is_empty);
		equals 	(world.plate_count, 1, 													globalized_is_alone);

		var plate = plates[0];
		for (var i=0, li=plates.length; i<li; ++i) { 
			plate = plates[i]; 

			// is_riftable: count == 0 or (count = 1 and top_plate = i) 
			equals 	(plate_map, i,                             							globalized_is_on_top); 
			and 	(globalized_is_alone, globalized_is_on_top,         				globalized_is_riftable); 
			or 		(globalized_is_riftable, globalized_is_empty,       				globalized_is_riftable); 

			resample(globalized_is_riftable, plate.global_ids_of_local_cells,       	localized_is_riftable); 
			erode 	(localized_is_riftable, 1,                       					localized_will_stay_riftable,     scratch_ui8); 
			margin 	(plate.mask, 1,                           							localized_is_just_outside_border, scratch_ui8); 
			and 	(localized_will_stay_riftable, localized_is_just_outside_border,  	localized_is_rifting); 

	        fill_into(plate.mask, 1, localized_is_rifting,                 				plate.mask); 
	        fill_into_crust(plate.crust, ocean, localized_is_rifting, 					plate.crust);
		}

	  	scratchpad.deallocate('rift');
	} 
	function detach_and_accrete(world, plates) {
	  	var plate_map = world.plate_map;
	  	var grid = world.grid;

		// WARNING: unfortunate side effect!
		// we calculate accretion delta during detachment for performance reasons
		var globalized_accretion = world.accretion.sial;
		Float32Raster.fill(globalized_accretion, 0);

	  	var scratchpad = RasterStackBuffer.scratchpad;
	  	scratchpad.allocate('detach_and_accrete');

	  	//rifting/detaching variables
		var localized_is_detachable = scratchpad.getUint8Raster(grid);
		var localized_will_stay_detachable = scratchpad.getUint8Raster(grid);
		var localized_is_just_inside_border = scratchpad.getUint8Raster(grid);
		var localized_is_detaching = scratchpad.getUint8Raster(grid);

		var localized_scratch_ui8 = scratchpad.getUint8Raster(grid); 
		var localized_accretion = scratchpad.getFloat32Raster(grid); 

		//global rifting/detaching variables
		var globalized_is_not_alone = scratchpad.getUint8Raster(grid);
		var globalized_is_detachable = scratchpad.getUint8Raster(grid);
		var globalized_is_not_on_top = scratchpad.getUint8Raster(grid);

		var globalized_scalar_field = scratchpad.getFloat32Raster(grid); 

		var mult_field = ScalarField.mult_field;
		var fill_into = Uint8RasterGraphics.fill_into_selection;
		var resample_ui8 = Uint8Raster.get_ids;
		var resample_f32 = Float32Raster.get_ids;
		var padding = BinaryMorphology.padding;
		var and = BinaryMorphology.intersection;
		var erode = BinaryMorphology.erosion;
		var not_equals = Uint8Field.ne_scalar;
		var gt_f32 = ScalarField.gt_scalar;
		var add = ScalarField.add_field;

		//				 op 	operands													result
		not_equals 		(world.plate_count, 1, 												globalized_is_not_alone);

		var plate = plates[0];
		for (var i=0, li=plates.length; i<li; ++i) {
		    plate = plates[i];

			not_equals 	(plate_map, i, 														globalized_is_not_on_top);

		    //detect detachment
			// is_detachable: count > 1 and top_plate != i
		    and 		(globalized_is_not_alone, globalized_is_not_on_top,					globalized_is_detachable);

            resample_ui8(globalized_is_detachable, plate.global_ids_of_local_cells, 		localized_is_detachable);
            erode		(localized_is_detachable, 1,										localized_will_stay_detachable, 	localized_scratch_ui8);
		    padding 	(plate.mask, 1, 													localized_is_just_inside_border, 	localized_scratch_ui8);
        	gt_f32		(plate.density, world.mantleDensity, 								localized_is_detachable);
		    and 		(localized_will_stay_detachable, localized_is_just_inside_border, 	localized_is_detaching);
		    and 		(localized_is_detaching, localized_is_detachable, 					localized_is_detaching);

	        fill_into 	(plate.mask, 0, localized_is_detaching,                 			plate.mask); 
	        
	        // calculate accretion delta
        	mult_field	(plate.crust.sial, localized_is_detaching,							localized_accretion);
        	resample_f32(localized_accretion, plate.local_ids_of_global_cells,				globalized_scalar_field);
        	add 		(globalized_accretion, globalized_scalar_field, 					globalized_accretion);
		}

	  	scratchpad.deallocate('detach_and_accrete');
	}
	function calculate_deltas(world, timestep) {

       	// CALCULATE DELTAS
		TectonicsModeling.get_erosion(
			world.displacement, world.SEALEVEL, timestep,
			world.crust, world.erosion, world.crust_scratch
		);
		Crust.assert_conserved_transport_delta(world.erosion, 1e-2); 

		// COMPILE DELTAS
		var globalized_deltas = world.crust_delta;
		Crust.reset(globalized_deltas);
		Crust.add_delta 	(globalized_deltas, world.erosion, 							globalized_deltas);
		ScalarField.add_field(globalized_deltas.sial, world.accretion.sial, 			globalized_deltas.sial);
		ScalarField.add_scalar(globalized_deltas.age, timestep, 						globalized_deltas.age); // aging
	}

	function integrate_deltas(world, plates) { 
		// INTEGRATE DELTAS

	  	var grid = world.grid;

	  	var scratchpad = RasterStackBuffer.scratchpad;
	  	scratchpad.allocate('integrate_deltas');
	  	
	  	var plate_map = world.plate_map;

		var localized_is_on_top = scratchpad.getUint8Raster(grid);
		var globalized_is_on_top = scratchpad.getUint8Raster(grid);
		var scratch_f32 = scratchpad.getFloat32Raster(grid);

		var resample_ui8 = Uint8Raster.get_ids;
		var equals = Uint8Field.eq_scalar;
		
		var resample_crust 	= Crust.get_ids;
		var mult_crust 		= Crust.mult_field;
        var fix_crust_delta	= Crust.fix_delta;
       	var add_crust_delta	= Crust.add_delta;

	  	var plate; 
		var global_ids_of_local_cells;
		var globalized_deltas = world.crust_delta;
		var localized_deltas = world.crust_scratch;
		for (var i=0, li=plates.length; i<li; ++i) {
		    plate = plates[i];

		    global_ids_of_local_cells = plate.global_ids_of_local_cells;

			equals 			(plate_map, i, 												globalized_is_on_top);
        	resample_ui8	(globalized_is_on_top, global_ids_of_local_cells,			localized_is_on_top);

        	resample_crust	(globalized_deltas, global_ids_of_local_cells,				localized_deltas);
        	mult_crust 		(localized_deltas, localized_is_on_top, 					localized_deltas);

	        // enforce constraint: erosion should never exceed amount of rock available
	        // get_erosion() guarantees against this, but plate motion sometimes causes violations to this constraint
	        // violations to constraint are usually small, so we just modify erosion after the fact to preserve the constraint
	        fix_crust_delta	(localized_deltas, plate.crust, scratch_f32);
        	add_crust_delta	(plate.crust, localized_deltas, 							plate.crust);
		}

	  	scratchpad.deallocate('integrate_deltas');

	}

	World.prototype.SEALEVEL = 3682;
	World.prototype.mantleDensity=3075; // derived empirically using isostatic model
	World.prototype.waterDensity=1026;
	World.prototype.ocean = 
	 new RockColumn({
		elevation: 	-3682,	// Charette & Smith 2010
		sima: 		7100, 	// +/- 800, White McKenzie and O'nions 1992
		// sial: 		100, // This can be set above zero to "cheat" on sial mass conservation
		// thickness: 	7100, 	// +/- 800, White McKenzie and O'nions 1992
		density: 	2890	// Carlson & Raskin 1984
	 });

	World.prototype.resetPlates = function() {
		// get plate masks from image segmentation of asthenosphere velocity
		update_calculated_fields(this);
		var pressure = TectonicsModeling.get_asthenosphere_pressure(this.density);
		TectonicsModeling.get_asthenosphere_velocity(pressure, this.asthenosphere_velocity);
		var angular_velocity = VectorField.cross_vector_field(this.asthenosphere_velocity, this.grid.pos);
		var plate_map = TectonicsModeling.get_plate_map(angular_velocity, 7, 200);
		var plate_ids = Uint8Dataset.unique(plate_map);
		this.plates = [];

		var plate;
		// TODO: overwrite plates instead of creating new ones, create separate function for plate initialization
		for (var i = 0, li = plate_ids.length; i < li; ++i) {
			var mask = Uint8Field.eq_scalar(plate_map, plate_ids[i]);

			//TODO: comment this out when you're done
			var eulerPole = VectorDataset.weighted_average(angular_velocity, mask)
			//TODO: fix it properly - no negation!
			Vector.normalize(-eulerPole.x, -eulerPole.y, -eulerPole.z, eulerPole); 

			plate = new Plate({
				world: 	this,
				mask: 	mask,
				eulerPole: eulerPole
			})
			Crust.copy(this.crust, plate.crust);

			// TODO: see if you can't get this to reflect relative magnitude of average surface asthenosphere velocity
			plate.angularSpeed = this.getRandomPlateSpeed();

			this.plates.push(plate);
		}
	};

	World.prototype.update = function(timestep){
		if (timestep === 0) {
			return;
		};

		move_plates 			(this.plates, timestep); 	// this performs the actual plate movement
		this.supercontinentCycle.update(timestep); 			// this periodically splits the world into plates
		update_calculated_plate_fields(this.plates); 		// this calculates properties for each plate, like density
		merge_plates_to_master	(this.plates, this); 		// this stitches plates together to create a world map
		update_calculated_fields(this); 					// this creates world maps for things like density and elevation
		rift 					(this, this.plates); 		// this identifies rifting regions on the world map and adds crust to plates where needed
		detach_and_accrete 		(this, this.plates); 		// this identifies detaching regions on the world map and then removes crust from plates where needed
		calculate_deltas		(this, timestep); 			// this creates a world map of all additions and subtractions to crust (e.g. from erosion, accretion, etc.)
		integrate_deltas 		(this, this.plates); 		// this uses the map above in order to add and subtract crust
	};
	World.prototype.worldLoaded = function(timestep){
		merge_plates_to_master(this.plates, this);
	};
	return World;
})();
