// Thermodynamics is a namespace isolating all business logic relating to the transfer of radiation
// This was written so I could decouple academic concerns (like how to model something mathematically) from architectural concerns (like how a model is represented through classes)
// All functions within the namespace are static and have no side effects
// The only data structures allowed are rasters and grid objects

var Thermodynamics = (function() {
	var Thermodynamics = {};

	// NOTE: this stays a private variable here until we can figure out where else to put it.
	var SPEED_OF_LIGHT = 299792458 * Units.METER / Units.SECOND; 

	Thermodynamics.BOLTZMANN_CONSTANT = 1.3806485279e-23 * Units.JOULE / Units.KELVIN;
	Thermodynamics.STEPHAN_BOLTZMANN_CONSTANT = 5.670373e-8 * Units.WATT / (Units.METER*Units.METER* Units.KELVIN*Units.KELVIN*Units.KELVIN*Units.KELVIN);
	Thermodynamics.PLANCK_CONSTANT = 6.62607004e-34 * Units.JOULE * Units.SECOND;
	Thermodynamics.MODERN_COSMIC_BACKGROUND_TEMPERATURE = 2.725 * Units.KELVIN;


	Thermodynamics.get_energy_of_photon_at_wavelength = function(wavelength) {
		return Thermodynamics.PLANCK_CONSTANT * SPEED_OF_LIGHT / wavelength;
	}

	// returns photon flux density in moles of photons per square meter per second
	Thermodynamics.get_black_body_emissive_photons_per_watt_between_wavelengths = function(lo, hi, temperature, sample_count, iterations_per_sample) {
		sample_count = sample_count || 1;
		iterations_per_sample = iterations_per_sample || 5;
		var sum = 0;
		var range = hi-lo;
		var δλ = range / sample_count;
		var T = temperature;
		var F = Thermodynamics.solve_black_body_fraction_between_wavelengths;
		var E = Thermodynamics.get_energy_of_photon_at_wavelength;
		for (var λ = lo; λ < hi; λ += δλ) {
			sum += F(λ, λ+δλ, T, iterations_per_sample) / E(λ+δλ/2);
		}
		return sum;
	}

	// see Lawson 2004, "The Blackbody Fraction, Infinite Series and Spreadsheets"
	Thermodynamics.solve_black_body_fraction_below_wavelength = function(wavelength, temperature, iterations){ 
		iterations = iterations || 5;
		var π = Math.PI;
		var h = Thermodynamics.PLANCK_CONSTANT;
		var k = Thermodynamics.BOLTZMANN_CONSTANT;
		var c = SPEED_OF_LIGHT;
		var λ = wavelength;
		var T = temperature;
		var C2 = h*c/k;
		var z = C2 / (λ*T);
		var z2 = z*z;
		var z3 = z2*z;
		var sum = 0;
		for (var n=1, n2=0, n3=0; n < iterations; n++) {
			n2 = n*n;
			n3 = n2*n;
			sum += (z3 + 3*z2/n + 6*z/n2 + 6/n3) * Math.exp(-n*z) / n;
		}
		return 15*sum/(π*π*π*π);
	}
	Thermodynamics.solve_black_body_fraction_between_wavelengths = function(lo, hi, temperature, iterations){
		iterations = iterations || 5;
		return 	Thermodynamics.solve_black_body_fraction_below_wavelength(hi, temperature, iterations) - 
				Thermodynamics.solve_black_body_fraction_below_wavelength(lo, temperature, iterations);
	}




	// This calculates the radiation (in watts/m^2) that's emitted by a single object
	Thermodynamics.get_black_body_emissive_radiation_flux = function(temperature) {
		return Thermodynamics.STEPHAN_BOLTZMANN_CONSTANT * temperature * temperature * temperature * temperature;
	}
	// This calculates the radiation (in watts/m^2) that's emitted by the surface of an object.
	Thermodynamics.get_black_body_emissive_radiation_fluxes = function(
			temperature,
			result
		) {
		result = result || Float32Raster(temperature.grid);
		Float32Raster.fill(result, 1);
		ScalarField.mult_field	(result, 		temperature, 						result);
		ScalarField.mult_field	(result, 		temperature, 						result);
		ScalarField.mult_field	(result, 		temperature, 						result);
		ScalarField.mult_field	(result, 		temperature, 						result);
		ScalarField.mult_scalar	(result, 		Thermodynamics.STEPHAN_BOLTZMANN_CONSTANT, 	result);

		return result;
	}







	// This calculates the uniform (non-field) temperature of a body given its luminosity 
	// TODO: put this under a new namespace? "Thermodynamics"? 
	Thermodynamics.get_equilibrium_temperature = function(heat) { 
		return Math.pow(heat/Thermodynamics.STEPHAN_BOLTZMANN_CONSTANT, 1/4); 
	} 
	// This calculates the temperature of a body given its luminosity
	// TODO: put this under a new namespace? "Thermodynamics"?
	Thermodynamics.get_equilibrium_temperatures = function(
			luminosity,
			result
		) {
		result = result || Float32Raster(luminosity.grid);
		ScalarField.mult_scalar	(luminosity, 	1/Thermodynamics.STEPHAN_BOLTZMANN_CONSTANT,result);
		ScalarField.pow_scalar	(result, 		1/4, 										result);

		return result;
	}



	// calculates entropy given an energy and temperature,
	// returns results in Joules per Kelvin
	Thermodynamics.get_entropy = function(E, T) {
		return E/(Thermodynamics.BOLTZMANN_CONSTANT * T);
	}
	// calculates entropy given an energy flux and two temperature extremes,
	// returns results in Watts per Kelvin
	Thermodynamics.get_entropy_production = function(F, Th, Tc) {
		return F/(Thermodynamics.BOLTZMANN_CONSTANT * (Th - Tc));
	}




	Thermodynamics.guess_entropic_heat_flows = function(heat, heat_flow, result) {
		result = result || Float32Raster.FromExample(heat);

		var heat_flow_field = result;
		Float32Dataset.normalize(heat, result, -heat_flow, heat_flow);
		ScalarTransport.fix_conserved_quantity_delta(result, 1e-5);

		return result;
	}
  	// calculates entropic heat flow within a 2 box temperature model  
	// calculates heat flow within a 2 box temperature model 
	// using the Max Entropy Production Principle and Gradient Descent
	// for more information, see Lorenz et al. 2001: 
	// "Titan, Mars and Earth : Entropy Production by Latitudinal Heat Transport"
	Thermodynamics.solve_entropic_heat_flow = function(insolation_hot, insolation_cold, emission_coefficient, iterations) {
		iterations = iterations || 10;

		var Ih = insolation_hot;
		var Ic = insolation_cold;
		var β = emission_coefficient || 1.;
		// temperature given net energy flux

		var T = Thermodynamics.get_equilibrium_temperature;
		var S = Thermodynamics.get_entropy_production;

		// entropy production given heat flux
		function N(F, Ih, Ic) {
			return S(F, T((Ic+F)/β), T((Ih-F)/β));
		}
 
	    // heat flow 
	    var F = (Ih-Ic)/4; 
	    var dF = F/iterations; // "dF" is a measure for how much F changes with each iteration 
	    // reduce step_size by this fraction for each iteration 
	    var annealing_factor = 0.8; 
		// amount to change F with each iteration
		for (var i = 0; i < iterations; i++) {
			// TODO: relax assumption that world must have earth-like rotation (e.g. tidally locked)
			dN = N(F-dF, Ih, Ic) - N(F+dF, Ih, Ic);
			F -= dF * Math.sign(dN);
			dF *= annealing_factor;
		}
		// console.log(T(Ih-2*F)-273.15, T(Ic+F)-273.15)
		return F;
	}




	return Thermodynamics;
})();
