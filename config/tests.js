console.log("welcome to the tests");

test("a basic test example", function (assert) {
    assert.ok(true, "this test is fine");
    var value = "hello";
    assert.equal("hello", value, "We expect value to be hello");
});


test("another basic test example", function (assert) {
    assert.ok(true, "this test is fine");
    var value = "Hola";
    assert.equal("hello", value, "We expect value to be hello");
});
