import { unexpected, assertUnreachable } from "./utils";

export const MAX_INDEX = 0x3FFF;
export const MAX_COUNT = 0x3FFF;

export interface Unit {
  sourceFilename: string;
  functions: { [id: string]: Function };
  entryFunctionID: string;
  moduleVariables: string[];
  globalImports: string[];
}

// Note: `stackChange` is a number describing how much the stack is expected to
// change after executing the operation.
export const opcodes = {
  'ArrayGet':    { operands: [                              ], stackChange: -1              },
  'ArrayNew':    { operands: [                              ], stackChange: 1               },
  'ArraySet':    { operands: [                              ], stackChange: -3              },
  'BinOp':       { operands: ['OpOperand'                   ], stackChange: -1              },
  'Branch':      { operands: ['LabelOperand', 'LabelOperand'], stackChange: -1              },
  'Call':        { operands: ['CountOperand'                ], stackChange: callStackChange },
  'CallMethod':  { operands: ['NameOperand', 'CountOperand' ], stackChange: callMethodStackChange },
  'Decr':        { operands: [                              ], stackChange: 0               },
  'Dup':         { operands: [                              ], stackChange: 1               },
  'Incr':        { operands: [                              ], stackChange: 0               },
  'Jump':        { operands: ['LabelOperand'                ], stackChange: 0               },
  'Literal':     { operands: ['LiteralOperand'              ], stackChange: 1               },
  'LoadArg':     { operands: ['IndexOperand'                ], stackChange: 1               },
  'LoadGlobal':  { operands: ['NameOperand'                 ], stackChange: 1               },
  'LoadModVar':  { operands: ['NameOperand'                 ], stackChange: 1               },
  'LoadVar':     { operands: ['IndexOperand'                ], stackChange: 1               },
  'ObjectGet':   { operands: ['NameOperand'                 ], stackChange: 0               },
  'ObjectNew':   { operands: [                              ], stackChange: 1               },
  'ObjectSet':   { operands: ['NameOperand'                 ], stackChange: -2              },
  'Pop':         { operands: ['CountOperand'                ], stackChange: popStackChange  },
  'Return':      { operands: [                              ], stackChange: 1               },
  'StoreGlobal': { operands: ['NameOperand'                 ], stackChange: -1              },
  'StoreModVar': { operands: ['NameOperand'                 ], stackChange: -1              },
  'StoreVar':    { operands: ['IndexOperand'                ], stackChange: -1              },
  'UnOp':        { operands: ['OpOperand'                   ], stackChange: 0               },
};

export interface Function {
  type: 'Function';
  sourceFilename: string;
  id: string;
  entryBlockID: string;
  blocks: { [id: string]: Block }
  comments?: string[];
}

export interface Block {
  id: string;
  expectedStackDepthAtEntry: number;
  operations: Operation[];
  comments?: string[];
}

export interface Operation {
  opcode: Opcode;
  sourceLoc: { line: number; column: number; };
  operands: Operand[];
  comments?: string[];
  expectedStackDepthBefore: number;
  expectedStackDepthAfter: number;
}

/**
 * Amount the stack changes for a call operation
 */
function callStackChange(op: Operation): number {
  if (op.opcode !== 'Call') {
    return unexpected('Expected `Call` operation');
  }
  if (op.operands.length !== 1) {
    return unexpected('Invalid operands to `Call` operation');
  }
  const argCountOperand = op.operands[0];
  if (argCountOperand.type !== 'CountOperand') {
    return unexpected('Invalid operands to `Call` operation');
  }
  const argCount = argCountOperand.count;
  // Adds one value to the stack (the return value). Pops all the arguments off
  // the stack, and pops the function reference off the stack.
  return 1 - argCount - 1;
}

/**
 * Amount the stack changes for a CallMethod operation
 */
function callMethodStackChange(op: Operation): number {
  if (op.opcode !== 'CallMethod') {
    return unexpected('Expected `CallMethod` operation');
  }
  if (op.operands.length !== 2) {
    return unexpected('Invalid operands to `CallMethod` operation');
  }
  const argCountOperand = op.operands[1];
  if (argCountOperand.type !== 'CountOperand') {
    return unexpected('Invalid operands to `CallMethod` operation');
  }
  const argCount = argCountOperand.count;
  // Adds one value to the stack (the return value). Pops all the arguments off
  // the stack, and pops object references off the stack.
  return 1 - argCount - 1;
}

/**
 * Amount the stack changes for a pop operation
 */
function popStackChange(op: Operation): number {
  if (op.opcode !== 'Pop') {
    return unexpected('Expected `Pop` operation');
  }
  if (op.operands.length !== 1) {
    return unexpected('Invalid operands to `Pop` operation');
  }
  const popCountOperand = op.operands[0];
  if (popCountOperand.type !== 'CountOperand') {
    return unexpected('Invalid operands to `Pop` operation');
  }
  const popCount = popCountOperand.count;
  return -popCount;
}

export type Opcode = keyof typeof opcodes;

// Similar to `Value` but doesn't support arrays and objects at this time, and can reference a LabelOperand
export type Operand =
  | LabelOperand
  | NameOperand
  | CountOperand
  | LiteralOperand
  | IndexOperand
  | OpOperand

export type OperandType = Operand['type'];

export interface LabelOperand {
  type: 'LabelOperand';
  targetBlockID: string;
}

export interface NameOperand {
  type: 'NameOperand';
  name: string;
}

export interface CountOperand {
  type: 'CountOperand';
  count: number;
}

export interface LiteralOperand {
  type: 'LiteralOperand';
  literal: Value;
}

export interface IndexOperand {
  type: 'IndexOperand';
  index: number;
}

export interface OpOperand {
  type: 'OpOperand';
  subOperation: string;
}

export type Value =
  | UndefinedValue
  | NullValue
  | BooleanValue
  | NumberValue
  | StringValue

export interface UndefinedValue {
  type: 'UndefinedValue';
  value: undefined;
}

export interface NullValue {
  type: 'NullValue';
  value: null;
}

export interface BooleanValue {
  type: 'BooleanValue';
  value: boolean;
}

export interface NumberValue {
  type: 'NumberValue';
  value: number;
}

export interface StringValue {
  type: 'StringValue';
  value: string;
}

export type LiteralValueType = boolean | number | string | undefined | null;

export type BinOpCode =
  |  "+"
  |  "-"
  |  "/"
  |  "%"
  |  "*"
  |  "**"
  |  "&"
  |  "|"
  |  ">>"
  |  ">>>"
  |  "<<"
  |  "^"
  //|  "==" (not allowed)
  |  "==="
  // |  "!=" (not allowed)
  |  "!=="
  // |  "in"
  // |  "instanceof"
  |  ">"
  |  "<"
  |  ">="
  |  "<="

export type UnOpCode =
  | "-"
  | "+"
  | "!"
  | "~"
  //| "typeof"
  //| "void"
  //| "delete"

export function isNameOperand(value: Operand): value is NameOperand {
  return value.type === 'NameOperand';
}

export function isLabelOperand(value: Operand): value is LabelOperand {
  return value.type === 'LabelOperand';
}

export function isLiteralOperand(value: Operand): value is LiteralOperand {
  return value.type === 'LiteralOperand';
}

export const undefinedValue: UndefinedValue = {
  type: 'UndefinedValue',
  value: undefined
}

export const nullValue: NullValue = {
  type: 'NullValue',
  value: null
}