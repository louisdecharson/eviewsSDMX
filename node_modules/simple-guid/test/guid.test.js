var assert = require('assert');

var guid = require('../');

suite('guid', function() {

  test('creates a unique guid', function() {
    var guid1 = guid();
    var guid2 = guid();

    assert.notEqual(guid1, guid2);
    
  });
  
});

