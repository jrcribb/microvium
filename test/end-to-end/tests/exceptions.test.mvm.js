/*---
description: >
  Testing exceptions
runExportedFunction: 0
# testOnly: true
expectException: "My uncaught exception"
expectedPrintout: foo
assertionCount: 14
---*/

vmExport(0, run);

function run() {
  test_minimalTryCatch();
  test_catchWithoutThrow();
  test_throwUnwinding();
  test_normalUnwinding();
  test_throwAcrossFrames();
  test_conditionalThrow();
  test_exceptionParameter();
  test_exceptionParameterWithClosure();
  test_rethrow();
  test_breakOutOfTry();
  test_breakOutOfTryWithClosure();
  test_breakOutOfCatch();
  test_breakOutOfDoubleCatch();

  test_uncaughtException(); // Last test because it throws without catching
}

function test_uncaughtException() {
  print('foo'); // Should print
  throw "My uncaught exception"
  print('bar'); // Should not print
}

function test_minimalTryCatch() {
  let s = '';
  // The try will emit the instruction `StartTry` to push to the exception stack
  try {
    s += 'a';
    // The throw will emit the `Throw` instruction which should unwind the stack
    // and jump to the catch block.
    throw 'boo!'
    s += 'b';
  } catch {
    // (Entry into the catch should pop the exception since it's unused)
    s += 'c';
  }

  assertEqual(s, 'ac');
}

function test_catchWithoutThrow() {
  /*
  When an exception isn't thrown, the try block epilog needs to correctly unwind
  with `EndTry`
  */

  let s = '';
  try {
    s += 'a';
    s += 'b';
  } catch {
    s += 'c';
  }

  assertEqual(s, 'ab');
}

function test_throwUnwinding() {
  let s = '';
  try {
    s += 'a';
    try {
      s += 'b';
      throw 1;
      s += 'c';
    } catch {
      s += 'd';
    }
    s += 'e';
    // The above `try` and corresponding `throw 1` should push and pop the
    // exception stack respectively. The following `throw` then checks that
    // we're using the popped catch target (g) and not the original (d).
    throw 2;
    s += 'f';
  } catch {
    s += 'g';
  }

  assertEqual(s, 'abdeg');
}

function test_normalUnwinding() {
  let s = '';
  try {
    s += 'a';
    try {
      s += 'b';
      s += 'c';
    } catch {
      s += 'd';
    }
    s += 'e';
    // The above `try` ends with an `EndTry` operation rather than `Throw`,
    // because it doesn't throw. The `EndTry` should pop the exception stack.
    // The following `throw` then checks that we're using the popped catch
    // target (g) and not the original (d).
    throw 2;
    s += 'f';
  } catch {
    s += 'g';
  }

  assertEqual(s, 'abceg');
}

function test_throwAcrossFrames() {
  let s = '';
  try {
    s += 'a'
    functionThatThrows()
    s += 'b'
  } catch {
    s += 'c'
  }

  assertEqual(s, 'adc');

  function functionThatThrows() {
    s += 'd'
    // The throw here should unwind the stack to get to the catch block
    throw 1;
    s += 'e'
  }
}

function test_conditionalThrow() {
  /*
  This test is mainly to make sure that the static analysis does not think that
  the code after the if-statement is unreachable if one of the branches is
  unreachable.
  */
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += i;
    try {
      s += 'a'
      // Check throwing in the consequent branch
      if (i % 3 === 0) {
        s += 'b'
        throw 1;
      }
      s += 'c'
      // Check throwing in the alternate branch
      if (i % 3 !== 1) {
        s += 'd'
      }
      else {
        s += 'e'
        throw 2;
      }
      // The static analysis needs to
      s += 'f'
    } catch {
      s += 'g';
    }
    s += 'h'
  }

  assertEqual(s, '0abgh1acegh2acdfh3abgh');
}

function test_exceptionParameter() {
  let x = 1;
  var v0
  try {
    let y
    var v1
    throw 42;
  } catch (e) {
    let z
    var v2
    x = e;
  }
  assertEqual(x, 42)
}

function test_exceptionParameterWithClosure() {
  let x = 1;
  let f;
  var v0
  try {
    let y
    var v1
    throw 42;
  } catch (e) {
    let z
    var v2
    x = e;
    f = () => e;
  }
  assertEqual(x, 42)
  assertEqual(f(), 42)
}

function test_rethrow() {
  try {
    try {
      throw { message: "boo!" }
    } catch (e) {
      throw e
    }
  } catch (e) {
    assertEqual(e.message, "boo!")
  }
}

function test_breakOutOfTry() {
  let flow = 'start'
  for (let i = 0; i < 100; i++) {
    flow += `_i${i}`
    try {
      if (i === 2) {
        let x
        flow += '_break'
        // The break here should pop `x` off the stack, `EndTry`, but should not
        // pop the loop variable because the break jumps to the loops
        // terminating block which pops the loop variable.
        break;
      }
    } catch {
      // This should never execute
      flow += '_catch'
    }
    // This should execute once
    flow += '_loopEnd'
  }
  assertEqual(flow, 'start_i0_loopEnd_i1_loopEnd_i2_break')
}

function test_breakOutOfTryWithClosure() {
  let flow = 'start'
  for (let i = 0; i < 100; i++) {
    flow += `_i${i}`;
    // This forces loop variable `i` to be closure allocated
    (() => i);
    try {
      if (i === 2) {
        let x
        flow += '_break'
        // The break here should pop `x` off the stack, `EndTry`, but should not
        // pop the closure scope because the break jumps to the loops
        // terminating block which pops the closure scope.
        break;
      }
    } catch {
      // This should never execute
      flow += '_catch'
    }
    // This should execute once
    flow += '_loopEnd'
  }
  assertEqual(flow, 'start_i0_loopEnd_i1_loopEnd_i2_break')
}

function test_breakOutOfCatch() {
  let flow = 'start'
  var v1;
  for (let i = 0; i < 100; i++) {
    // Stack depth 2
    flow += `_i${i}`;
    let a
    var v2;
    // Stack depth 3
    try {
      // Stack depth 5
      let b
      var v3;
      // Stack depth 6
      try {
        // Stack depth 8
        let c
        var v4;
        // Stack depth 9
        if (i === 2) {
          let d
          var v5;
          // Stack depth 10
          flow += '_throw'
          throw { message: "boo!" }
        }
      } catch (e1) {
        let x
        var v6;
        flow += '_catch1'
        // The break here should pop `x`, `e1`, `b`, and `a` off the stack but
        // not the inner `try` since we're already outside the try block. But it
        // should also pop the outer `catch` since that's still on the stack.
        // The break itself should not pop `i` or `flow`. `i` is popped by the
        // loop exit sequence, which is what we're jumping to with the break.
        break;
      }
    }
    catch (e2) {
      var v7;
      // This should never execute
      flow += '_catch2'
    }
    var v8;
    // This should execute once
    flow += '_loopEnd'
  }

  assertEqual(flow, 'start_i0_loopEnd_i1_loopEnd_i2_throw_catch1')
}

function test_breakOutOfDoubleCatch() {
  let flow = 'start'
  for (let i = 0; i < 100; i++) {
    flow += `_i${i}`;
    try {
      flow += `_try`;
      try {
        flow += `_try`;
        if (i === 1) {
          flow += '_throw'
          throw 'foo'
        }
      } catch (e) {
        flow += '_catch1'
        break;
      }
    } catch {
      // Should not get here
      flow += '_catch2'
    }
    flow += '_loopEnd'
  }

  assertEqual(flow, 'start_i0_try_try_loopEnd_i1_try_try_throw_catch1')
}

// TODO: return inside try
// TODO: return inside nested try
// TODO: return inside catch
// TODO: return inside nested catch
// TODO: garbage collection


