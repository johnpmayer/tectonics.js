function Simulation (parameters) {
	parameters = parameters || {};
	var _model 				= void 0;
	this.paused 			= parameters.paused || false;
	this.speed 				= parameters.speed || 1;
	this.elapsed_time		= parameters.elapsed_time || 0;
	this.seed 				= parameters.seed || 0;
	this.random 			= new Random(parseSeed(this.seed));
	if (parameters.random !== void 0) {
		this.random.mt  	= parameters.random.mt;
		this.random.mti 	= parameters.random.mti;
	}
	this._last_update_timestamp = 0;

	function parseSeed(text) {
			var parsed = parseInt(text);
			if(isNaN(parsed)) {
				parsed = 0;
				for (var i = 0; i < Math.min(8, text.length); i++) {
					parsed = (parsed * 256) + text.charCodeAt(i);
				}
			}
			return parsed;
	    }
	    
	// the "model" is the singular entity we are simulating
	// it can be anything that implements the correct interface: a universe, a planet, an atmosphere, etc.
	this.model = function(model) {
		if (model === void 0) {
			return _model;
		};
		_model = model;
		model.initialize();
	};
	if (parameters.model !== void 0) {
		this.model(new Universe(parameters.model));
	}

	this.focus = undefined;
	if (parameters.focus !== void 0 && _model !== void 0) {
		this.focus = _model.body_id_to_node_map[parameters.focus].body;
	} 

	this.getParameters = function() {
		return {
			model: 			_model !== void 0? _model.getParameters() : undefined,
			paused: 		this.paused,
			speed: 			this.speed,
			elapsed_time: 	this.elapsed_time,
			seed: 			this.seed,
			focus: 			this.focus.name, 
			random: {
				mt:  this.random.mt,
				mti: this.random.mti
			},
		};
	}

	this.update = function() {
		var now = performance.now();
		var seconds = (now - this._last_update_timestamp)/1000;
		this._last_update_timestamp = now;

		//minimum refresh rate of 5fps
		if (seconds > 1/5){
			return;
		}

		if (this.paused){
			return;
		}

		if (_model === void 0) {
			return;
		}

		this.elapsed_time += this.speed * seconds;

		var timestep = this.speed * seconds;

		_model.invalidate(timestep);
		_model.calcChanges(timestep);
		_model.applyChanges(timestep);
	};

	this.toggle_pause = function () {
		this.paused = !this.paused;
	}
}
