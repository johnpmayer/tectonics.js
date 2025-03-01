
var NameGenerator = (function() {
	// Returns a function that generates a weighted random choice 
	// Weights are indicated by a dict representing a stat distribution
	random_weighted_choice = function(distribution) {
	  var i, j, table=[];
	  for (i in distribution) {
	    // The constant 10 below should be computed based on the
	    // weights in the distribution for a correct and optimal table size.
	    // E.g. the distribution {0:0.999, 1:0.001} will break this impl.
	    for (j=0; j<distribution[i]*10; j++) {
	      table.push(i);
	    }
	  }
	  return function(random) {
	    return table[Math.floor(random.uniform(0,1) * table.length)];
	  }
	}

	// Returns a modified corpus that groups spaces, consonants, and vowel into tokens
	tokenize_corpus = function(corpus) {
		var text='';
		var tokenized = [];
		var regex = /[^aeiouyw ]+|[aeiouyw]+| +/g;
		for (var i = 0; i < corpus.length; i++) {
			text = corpus[i];
			tokenized.push(text.match(regex))
		}
		return tokenized;
	}

	// returns a dict mapping values in a dataset to their frequency
	get_distribution = function(dataset) {
		var distribution = {};
		var value;
		for (var i = 0; i < dataset.length; i++) {
			value = dataset[i];
			distribution[value] = distribution[value] || 0;
			distribution[value] += 1;
		}
		return distribution;
	}

	// returns a dict mapping first and last tokens of bigrams
	get_bigrams = function(corpus) {
		var mappings = {};
		for (var i = 0; i < corpus.length; i++) {
			text = corpus[i]
			weights = {}
			for (var j = 0; j < text.length-1; j++) {
				prev = text[j]
				next = text[j+1]
				mappings[prev] 		= mappings[prev] 		|| {};
				mappings[prev][next]= mappings[prev][next]	|| 0;
				mappings[prev][next] += 1;
			}
		}
		return mappings;
	}

	// returns a "markov model" based on a corpus of text
	// The markov model is represented by a dict mapping tokens to functions
	// Each function randomly generates a new token
	get_markov_model = function(corpus) {
		var bigrams = get_bigrams(corpus);
		var markov_model = {};
		for (var prev in bigrams){
			markov_model[prev] = random_weighted_choice(bigrams[prev])
		}
		return markov_model;
	}

	// runs "markov model" as generated by get_markov_model()
	run_markov_model = function(markov_model, random) {
		var prev=' '
		var next=''
		var text=''
		for (var i = 0; i < 20 && next != ' '; i++) {
			next = markov_model[prev](random);
			text += next;
			prev = next;
		}
		return text.trim()	
	}

	// Returns a "cost function" for text.
	// The cost function is lowest when text length is within a given range
	get_within_range_cost_fn = function(min, max) {
		return function(text) {
			return Math.max(Math.max(text.length - max, min - text.length), 0);
		}
	}

	// Returns a "cost function" for text.
	// The cost function is lowest when text is close to a given length
	get_near_length_cost_fn = function(length) {
		return function(text) {
			var distance = text.length - length;
			return distance*distance;
		}
	}

	get_near_length_blacklisted_cost_fn = function(length, blacklist_dict) {
		return function(text) {
			if(blacklist_dict[text]){ return Infinity; }
			var distance = text.length - length;
			return distance*distance;
		}
	}

	// Returns text from a markov model. 
	// The highest quality text is returned from a given number of tries.
	// "Quality" is determined by a cost function
	run_markov_model_best_of = function(markov_model, tries, cost_fn, random) {
		var text='';
		var cost=0.0;
		var best_text='';
		var best_cost=Infinity;
		for (var i = 0; 
			 i < tries; i++) {
			text = run_markov_model(markov_model, random);
			cost = cost_fn(text);
			if (cost == 0) { return text; }
			if (cost < best_cost) { 
				best_cost = cost;
				best_text = text;
			}
		}
		return best_text;
	}

	// Returns a generator function.
	// That generator function returns text that imitates that of a corpus
	// The generator function selects the highest quality candidate 
	// from a given number of tries. "Quality" is determined by a cost function.
	get_generator = function(corpus, tries, cost_fn) {
		var markov_model = get_markov_model(corpus);
		return function(random) {
			return run_markov_model_best_of(markov_model, tries, cost_fn, random);
		}
	}

	// Returns a generator function.
	// That generator function returns text that imitates that of a corpus
	// the length of the text is randomly generated based on a given stat distribution
	get_length_distribution_generator = function(corpus, tries, length_distribution) {
		var get_random_length = random_weighted_choice(length_distribution);
		var markov_model = get_markov_model(corpus);
		return function(random) {
			var length = parseInt(get_random_length(random));
			return run_markov_model_best_of(markov_model, tries, get_near_length_cost_fn(length), random);
		}
	}

	// Returns a generator function.
	// That generator function returns text that imitates that of a corpus
	// the length of the text tries to match the stat distribution found in the corpus
	get_realistic_length_generator = function(corpus, tries) {
		var length_distribution = get_distribution(corpus.map(text=>text.length));
		return get_length_distribution_generator(corpus, tries, length_distribution, random);
	}

	return namespace = {
		tokenize_corpus: tokenize_corpus,
		get_within_range_cost_fn: get_within_range_cost_fn,
		get_near_length_cost_fn: get_near_length_cost_fn,
		get_generator: get_generator,
		get_realistic_length_generator: get_realistic_length_generator,
		get_length_distribution_generator: get_length_distribution_generator,
	};

	test= function(corpus, tries, distribution, num_generated, random) {
		gen = get_length_distribution_generator(corpus, tries, distribution, random);
		generated = [];
		for (var i = 0; i < num_generated; i++) {
			generated.push(gen());
		}
		return generated;
	}
})();