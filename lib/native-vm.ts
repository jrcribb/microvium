const addon = require('bindings')('native-vm'); //require('../build/Release/native-vm');

export enum vm_TeError {
  VM_E_SUCCESS,
  VM_E_UNEXPECTED,
  VM_E_MALLOC_FAIL,
  VM_E_ALLOCATION_TOO_LARGE,
  VM_E_INVALID_ADDRESS,
  VM_E_COPY_ACROSS_BUCKET_BOUNDARY,
  VM_E_FUNCTION_NOT_FOUND,
  VM_E_INVALID_HANDLE,
  VM_E_STACK_OVERFLOW,
  VM_E_UNRESOLVED_IMPORT,
  VM_E_ATTEMPT_TO_WRITE_TO_ROM,
  VM_E_INVALID_ARGUMENTS,
  VM_E_TYPE_ERROR,
  VM_E_TARGET_NOT_CALLABLE,
}

export enum vm_TeType {
  VM_T_UNDEFINED,
  VM_T_NULL,
  VM_T_BOOLEAN,
  VM_T_NUMBER,
  VM_T_STRING,
  VM_T_BIG_INT,
  VM_T_SYMBOL,
  VM_T_FUNCTION,
  VM_T_OBJECT,
  VM_T_ARRAY,
}

export type HostFunctionID = number;
export type ExportID = number;

export type HostFunction = (object: Value, args: Value[]) => Value;

export type ResolveImport = (hostFunctionID: HostFunctionID) => HostFunction;

export class MicroVM {
  public static resume(snapshotBytecode: Buffer, resolveImport: ResolveImport): MicroVM {
    if (!Buffer.isBuffer(snapshotBytecode)) {
      // TODO: return argumentError()
      throw new Error('Invalid snapshot bytecode');
    }
    return new MicroVM(snapshotBytecode, resolveImport);
  }

  public resolveExport(exportID: ExportID): Value {
    // TODO: When the projects are unified this can just be isUInt16
    if ((exportID | 0 ) !== exportID || exportID < 0 || exportID > 0xFFFF) {
      // TODO: return argumentError()
      throw new Error('exportID must be an 16 bit unsigned integer');
    }
    const result = this._native.resolveExport(exportID);
    // TODO: Validate result
    return result;
  }

  public call(func: Value, args: Value[]): Value {
    // TODO: How do we validate the arguments?
    const result = this._native.call(func, args);
    // TODO: Validate result
    return result;
  }

  public get undefined(): Value {
    return this._native.undefined;
  }

  private constructor (snapshotBytecode: Buffer, resolveImport: any) {
    this._native = new addon.MicroVM(snapshotBytecode, resolveImport);
  }

  _native: IMicroVMNative;
}

export class VMError extends Error {
  errorCode: vm_TeError;

  constructor (errorCode: vm_TeError, message?: string | undefined) {
    super(message);
    this.errorCode = errorCode;
  }
}

export interface Value {
  readonly type: vm_TeType;
  asString(): string;
}

interface IMicroVMNative {
  call(func: Value, args: Value[]): Value;
  resolveExport(exportID: ExportID): Value;
  readonly undefined: Value;
}