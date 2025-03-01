// TESTS FOR EXPERIMENTAL FUNCTIONALITY
// NOT TO BE INCLUDED IN PRODUCTION

var experimentalViews = {};

experimentalViews.eliptic_ids = new ScalarWorldView(
		new HeatmapRasterView( { scaling: true}), 
	    function (crust) { 
	      var ids = Float32Raster(crust.grid); 
	      Float32Raster.FromUint16Raster(crust.grid.vertex_ids, ids); 
	      var pos = OrbitalMechanics.get_ecliptic_coordinates_raster_from_equatorial_coordinates_raster( 
	        crust.grid.pos, 
	        23.5/180*Math.PI, 
	        23.5/180*Math.PI 
	      ); 
	      return Float32Raster.get_nearest_values(ids, pos); 
	    } 
	 ); 
experimentalViews.get_varying_albedo 	= new ScalarWorldView(
	new HeatmapRasterView( { min: 0., max: 1.}),  
	function (world) {

		// dependencies: sealevel, displacement, mean_anomaly, ice_fraction, precip, npp, lai, plant_fraction, land_fraction
		var sealevel = world.hydrosphere.sealevel;
		var land_fraction = Float32RasterInterpolation.linearstep(sealevel-200, sealevel, world.displacement);
		var temp = AtmosphericModeling.surface_air_temp(world.grid.pos, world.meanAnomaly, Math.PI*23.5/180);

		var ice_fraction = Float32RasterInterpolation.mix( 
				1, 0, 
				Float32RasterInterpolation.linearstep(273.15-10, 273.15, temp)
			);
		Float32RasterGraphics.fill_into_selection(
			ice_fraction, 0.,
			ScalarField.lt_field(
				world.displacement, 
				Float32RasterInterpolation.mix(
					sealevel-1000, 
					sealevel-200, 
					Float32RasterInterpolation.linearstep(273.15-10, 273.15, temp)
				)
			),
			ice_fraction
		);

		var lat = Float32SphereRaster.latitude(world.grid.pos.y);
		var precipitation = Climatology.guess_precipitation_fluxes(lat);
		var npp_max = 1;
		var lai_max = 10;
		var npp = PlantBiology.net_primary_productivities(temp, precipitation, npp_max);
		var lai = PlantBiology.leaf_area_indices(npp, npp_max, lai_max);
		var plant_fraction = Float32RasterInterpolation.linearstep(0, 2, lai);
		albedo = AtmosphericModeling.get_varying_albedo(land_fraction, ice_fraction, plant_fraction);
		return albedo;
	}
);



experimentalViews.motion_test = new VectorWorldView( {  
    getField: function (world) { 
      var grid = world.grid; 
      var pos = grid.pos; 

      var plates = world.plates; 
      var plate = plates[0];
      var boundary_normal = Uint8Field.gradient(plate.mask); 

      return boundary_normal;


      var add_term = VectorField.add_vector_field_and_scalar_field_term; 
      var cross = VectorField.cross_vector; 
      var eq = Uint8Field.eq_scalar;
      return all_velocities; 
    }  
  } ); 


experimentalViews.plate0 	= new ScalarWorldView(
		new HeatmapRasterView( { min: 0., max: 1.}), 
		function (world) {
			return world.plates[0].mask;
		} 	
	);
experimentalViews.buoyancy 	= new ScalarWorldView(
		new HeatmapRasterView( { min: -2., max: 0.}), 
		function (world, buoyancy) {
			Crust.get_buoyancy(world.density, world.material_density, world.surface_gravity, buoyancy);
			return buoyancy;
		}
	);
experimentalViews.buoyancy_smoothed 	= new ScalarWorldView(
		new HeatmapRasterView( { min: -2., max: 0.}), 
		function (world, buoyancy) {
			Crust.get_buoyancy(world.density, world.material_density, world.surface_gravity, buoyancy);
			var pressure = TectonicsModeling.get_asthenosphere_pressure(buoyancy);
			return pressure;
		}
	);
experimentalViews.buoyancy_smoothed_laplacian = new VectorWorldView( {  
    getField: function (world) { 
			var buoyancy = Crust.get_buoyancy(world.density, world.material_density, world.surface_gravity);
			var pressure = TectonicsModeling.get_asthenosphere_pressure(buoyancy);
			var velocity = TectonicsModeling.get_asthenosphere_velocity(pressure);
			return velocity;
    }
  } ); 
experimentalViews.angular_velocity = new VectorWorldView( {  
    getField: function (world) { 
			var buoyancy = Crust.get_buoyancy(world.density, world.material_density, world.surface_gravity);
			var pressure = TectonicsModeling.get_asthenosphere_pressure(buoyancy);
			var velocity = TectonicsModeling.get_asthenosphere_velocity(pressure);
			var angular_velocity = VectorField.cross_vector_field(velocity, world.grid.pos);
			return angular_velocity;
    }
  } ); 
experimentalViews.plates = new ScalarWorldView(
		new HeatmapRasterView( { min: 0., max: 7.}), 
		function (world) {
			var buoyancy = Crust.get_buoyancy(world.density, world.material_density, world.surface_gravity);
			var pressure = TectonicsModeling.get_asthenosphere_pressure(buoyancy);
			var velocity = TectonicsModeling.get_asthenosphere_velocity(pressure);
			var angular_velocity = VectorField.cross_vector_field(velocity, world.grid.pos);
			var top_plate_map = TectonicsModeling.get_plate_map(angular_velocity, 7, 200);
			return top_plate_map;
		}
	);
var PLATE_ID = 0;
experimentalViews.velocity = new VectorWorldView( {  
    getField: function (world) { 
    		return world.plates[PLATE_ID].velocity;
    		
			var velocity = TectonicsModeling.get_plate_velocity(world.plates[PLATE_ID].mask, world.plates[PLATE_ID].buoyancy, world.material_viscosity);
			var speed = VectorField.magnitude(velocity);
			return velocity
    }
  } ); 
experimentalViews.speed 	= new ScalarWorldView(
		new HeatmapRasterView( { min: 0., max: 1.}), 
		function (world, result) {
			var plate = world.plates[0];

			Crust.get_buoyancy(plate.density, world.material_density, world.surface_gravity, plate.buoyancy);
			var velocity = TectonicsModeling.get_plate_velocity(plate.mask, plate.buoyancy, world.material_viscosity);
			return VectorField.magnitude(velocity, result);
		} 	
	);
experimentalViews.insolation 	= new ScalarWorldView(
		new HeatmapRasterView( { min: 0., max: 400.}), 
		function (world, result) {
			return world.atmosphere.average_insolation;
		} 	
	);
