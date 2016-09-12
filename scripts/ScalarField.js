("use strict");
var ScalarField = {};
ScalarField.TypedArray = function (grid, fill) {
  var result = new Float32Array(grid.vertices.length);
  if (fill !== void 0) { 
    for (var i=0, li=result.length; i<li; ++i) {
        result[i] = fill;
    }
  }
  return result;  
};
ScalarField.VertexTypedArray = function (grid, fill) {
  var result = new Float32Array(grid.vertices.length);
  if (fill !== void 0) { 
    for (var i=0, li=result.length; i<li; ++i) {
        result[i] = fill;
    }
  }
  return result;  
};
ScalarField.EdgeTypedArray = function (grid, fill) {
  var result = new Float32Array(grid.edges.length);
  if (fill !== void 0) { 
    for (var i=0, li=result.length; i<li; ++i) {
        result[i] = fill;
    }
  }
  return result;  
};
ScalarField.ArrowTypedArray = function (grid, fill) {
  var result = new Float32Array(grid.arrows.length);
  if (fill !== void 0) { 
    for (var i=0, li=result.length; i<li; ++i) {
        result[i] = fill;
    }
  }
  return result;  
};
ScalarField.TypedArrayOfLength = function (length, fill) {
  var result = new Float32Array(length);
  if (fill !== void 0) { 
    for (var i=0, li=result.length; i<li; ++i) {
        result[i] = fill;
    }
  }
  return result;  
};
ScalarField.add_field = function (field1, field2, result) {
  result = result || new Float32Array(field1.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field1[i] + field2[i];
  }
  return result;
};
ScalarField.sub_field = function (field1, field2, result) {
  result = result || new Float32Array(field1.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field1[i] - field2[i];
  }
  return result;
};
ScalarField.mult_field = function (field1, field2, result) {
  result = result || new Float32Array(field1.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field1[i] * field2[i];
  }
  return result;
};
ScalarField.div_field = function (field1, field2, result) {
  result = result || new Float32Array(field1.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field1[i] / field2[i];
  }
  return result;
};
ScalarField.add_scalar = function (field, scalar, result) {
  result = result || new Float32Array(field.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field[i] + scalar;
  }
  return result;
};
ScalarField.sub_scalar = function (field, scalar, result) {
  result = result || new Float32Array(field.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field[i] - scalar;
  }
  return result;
};
ScalarField.mult_scalar = function (field, scalar, result) {
  result = result || new Float32Array(field.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field[i] * scalar;
  }
  return result;
};
ScalarField.div_scalar = function (field, scalar, result) {
  result = result || new Float32Array(field.length);
  for (var i = 0, li = result.length; i < li; i++) {
    result[i] = field[i] / scalar;
  }
  return result;
};
ScalarField.min = function (field) {
  var min = Infinity;
  var value;
  for (var i = 0, li = field.length; i < li; i++) {
    value = field[i];
    if (value < min) min = value;
  }
  return min;
};
ScalarField.max = function (field) {
  var max = -Infinity;
  var value;
  for (var i = 0, li = field.length; i < li; i++) {
    value = field[i];
    if (value > max) max = value;
  }
  return max;
};
ScalarField.arrow_differential = function (field, grid, result) {
  result = result || ScalarField.ArrowTypedArray(grid);
  var arrows = grid.arrows;
  var arrow = [];
  for (var i = 0, li = arrows.length; i < li; i++) {
    arrow = arrows[i];
    result[i] = field[arrow[1]] - field[arrow[0]];
  }
  return result;
};
ScalarField.edge_differential = function (field, grid, result) {
  result = result || ScalarField.EdgeTypedArray(grid);
  var edges = grid.edges;
  var edge = [];
  for (var i = 0, li = edges.length; i < li; i++) {
    edge = edges[i];
    result[i] = field[edge[1]] - field[edge[0]];
  }
  return result;
};
ScalarField.vertex_differential = function (field, grid, result) {
  result = result || VectorField.VertexDataFrame(grid);
  var dpos = grid.pos_arrow_differential;
  var arrows = grid.arrows;
  var arrow = [];
  var from = 0, to = 0;
  var x = result.x;
  var y = result.y;
  var z = result.z;
  for (var i = 0, li = arrows.length; i < li; i++) {
    arrow = arrows[i];
    from = arrow[0];
    to = arrow[1];
    x[to] += field[from] - field[to];
    y[to] += field[from] - field[to];
    z[to] += field[from] - field[to];
  }
  var neighbor_lookup = grid.neighbor_lookup;
  var neighbor_count = 0;
  for (var i = 0, li = neighbor_lookup.length; i < li; i++) {
    neighbor_count = neighbor_lookup[i].length;
    x[i] /= neighbor_count || 1;
    y[i] /= neighbor_count || 1;
    z[i] /= neighbor_count || 1;
  }
  return result;
};
ScalarField.edge_gradient = function (field, grid, result) {
  result = result || VectorField.EdgeDataFrame(grid);
  var dfield = 0;
  var dpos = grid.pos_edge_differential;
  var dx = dpos.x;
  var dy = dpos.y;
  var dz = dpos.z;
  var x = result.x;
  var y = result.y;
  var z = result.z;
  var edges = grid.edges;
  var edge = [];
  for (var i = 0, li = edges.length; i < li; i++) {
    edge = edges[i];
    dfield = field[edge[1]] - field[edge[0]];
    x[i] = dfield / dx[i] || 0;
    y[i] = dfield / dy[i] || 0;
    z[i] = dfield / dz[i] || 0;
  }
  return result;
};
ScalarField.arrow_gradient = function (field, grid, result) {
  result = result || VectorField.ArrowDataFrame(grid);
  var dfield = 0;
  var dpos = grid.pos_arrow_differential;
  var dx = dpos.x;
  var dy = dpos.y;
  var dz = dpos.z;
  var x = result.x;
  var y = result.y;
  var z = result.z;
  var arrows = grid.arrows;
  var arrow = [];
  for (var i = 0, li = arrows.length; i < li; i++) {
    arrow = arrows[i];
    dfield = field[arrow[1]] - field[arrow[0]];
    x[i] = dfield / dx[i] || 0;
    y[i] = dfield / dy[i] || 0;
    z[i] = dfield / dz[i] || 0;
  }
  return result;
};
ScalarField.vertex_gradient = function (field, grid, result) {
  result = result || VectorField.VertexDataFrame(grid);
  var dfield = 0;
  var dpos = grid.pos_arrow_differential;
  var dx = dpos.x;
  var dy = dpos.y;
  var dz = dpos.z;
  var arrows = grid.arrows;
  var arrow = [];
  var x = result.x;
  var y = result.y;
  var z = result.z;
  for (var i = 0, li = arrows.length; i < li; i++) {
    arrow = arrows[i];
    dfield = field[arrow[1]] - field[arrow[0]];
    x[arrow[0]] += (dfield * dpos.x[i]) || 0;
    y[arrow[0]] += (dfield * dpos.y[i]) || 0;
    z[arrow[0]] += (dfield * dpos.z[i]) || 0;
  }
  var neighbor_lookup = grid.neighbor_lookup;
  var neighbor_count = 0;
  for (var i = 0, li = neighbor_lookup.length; i < li; i++) {
    neighbor_count = neighbor_lookup[i].length;
    x[i] /= neighbor_count || 1;
    y[i] /= neighbor_count || 1;
    z[i] /= neighbor_count || 1;
  }
  return result;
};
ScalarField.edge_gradient_similarity = function (field, grid, result) {
  result = result || ScalarField.EdgeTypedArray(grid);
  var gradient = ScalarField.vertex_gradient(field, grid);
  VectorField.edge_similarity(gradient, grid, result);
  return result;
};
ScalarField.arrow_gradient_similarity = function (field, grid, result) {
  result = result || ScalarField.ArrowTypedArray(grid);
  var gradient = ScalarField.vertex_gradient(field, grid);
  VectorField.arrow_similarity(gradient, grid, result);
  return result;
};
ScalarField.edge_laplacian = function (field, grid, result) {
  result = result || ScalarField.EdgeTypedArray(grid);
  var gradient = ScalarField.vertex_gradient(field, grid);
  VectorField.edge_divergence(gradient, grid, result);
  return result;
};
ScalarField.arrow_laplacian = function (field, grid, result) {
  result = result || ScalarField.ArrowTypedArray(grid);
  var gradient = ScalarField.vertex_gradient(field, grid);
  VectorField.arrow_divergence(gradient, grid, result);
  return result;
};

