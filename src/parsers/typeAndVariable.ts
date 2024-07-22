import { BaseToken } from '../main';
import { SyntaxError, changeKind, decorations, isAccessor, removeEmptyWords } from '../convert';

export type { Variable, Type };
export { parseArgsAndReturned, parseArgs, convertType, parseType, parseFunctionType };


interface Variable {
  name: string;
  type: Type;
  modifier?: 'ref' | 'ref readonly' | 'in' | 'out' | 'params';
}
type Type = NormalType | ArrayType | FunctionType | GenericsType | TupleType;
interface NormalType {
  type: string;
  qualifiedNames?: QualifiedName[];
  nullable?: boolean;
}
interface ArrayType {
  parentType: Type;
  // ジャグ配列、多次元配列への対応は未定
  // int#2##でint[2][][]、int#2|3でint[2, 3]とする予定
  qualifiedNames?: QualifiedName[];
  nullable?: boolean;
}
interface FunctionType {
  args: Variable[];
  returned: Type;
  qualifiedNames?: QualifiedName[];
  nullable?: boolean;
}
interface GenericsType {
  /** ジェネリクスの型名 */
  type: NormalType;
  /** ジェネリクスの型パラメータ */
  params: Type[];
  qualifiedNames?: QualifiedName[];
  nullable?: boolean;
}
interface TupleType {
  types: (Type | Variable)[];
  qualifiedNames?: QualifiedName[];
  nullable?: boolean;
}
interface QualifiedName {
  name: NormalType | GenericsType;
  accessor: '.' | '?.' | '!.' | '';
  nameToken: BaseToken;
  accessorToken: BaseToken;
}

const builtinTypes = ['bool', 'byte', 'sbyte', 'char', 'decimal', 'double', 'float', 'int', 'uint', 'nint', 'nuint', 'long', 'ulong', 'short', 'ushort', 'object', 'string', 'dynamic', 'void'];
function isBuiltinType(type: string) {
  return builtinTypes.includes(type);
}


function parseArgsAndReturned(tokens: BaseToken[]) {
  tokens = removeEmptyWords(tokens);

  const argsAndReturned = parseFunctionType(tokens, true, true, false, false);

  return argsAndReturned.type;
}
function parseArgs(tokens: BaseToken[]) {
  tokens = removeEmptyWords(tokens);

  const args: Variable[] = [];
  let i = 0;
  while (i < tokens.length) {
    const variable = parseVariable(tokens.slice(i), true, true, false);
    if (variable.variable === null)
      throw new SyntaxError(tokens[i]);
    args.push(variable.variable);
    i += variable.endAt;
    if (i >= tokens.length) {
      decorations.push({ start: tokens[0].start, end: tokens[tokens.length - 1].end, kind: 'fn-args' });
      break;
    }
    if (tokens[i].text === ',')
      i++;
    else
      throw new SyntaxError(tokens[i]);
  }

  return args;
}

function parseVariable(tokens: BaseToken[], isFnArg: boolean, earlyReturn: boolean, nextEarlyReturn: boolean): {
  variable: Variable | null;
  endAt: number;
} {
  if (tokens.length === 0)
    throw new SyntaxError(null, 'Missing variable name');

  let name = tokens[0].text;
  if (name === '_') {
    return {
      variable: null,
      endAt: 1,
    };
  }
  if (tokens.length === 1)
    throw new SyntaxError(tokens[0], 'Missing type');

  let modifier: 'ref' | 'ref readonly' | 'in' | 'out' | 'params' | undefined;
  let colonIndex: number;
  if (name === 'ref') {
    if (tokens[1].text === 'immut') {
      modifier = 'ref readonly';
      name = tokens[2].text;
      colonIndex = 3;
    } else {
      modifier = 'ref';
      name = tokens[1].text;
      colonIndex = 2;
    }
  } else if (name === 'in' || name === 'out' || name === 'params') {
    modifier = name as 'in' | 'out' | 'params';
    name = tokens[1].text;
    colonIndex = 2;
  } else {
    modifier = undefined;
    colonIndex = 1;
  }
  if (tokens[colonIndex].text !== ':') {
    throw new SyntaxError(tokens[0], 'Missing colon');
  }
  changeKind(tokens[colonIndex - 1], isFnArg ? 'name.fn-arg' : 'name.var', true);
  if (tokens.length < colonIndex + 2) {
    throw new SyntaxError(tokens[colonIndex], 'Missing type');
  }
  const type = parseType(tokens.slice(colonIndex + 1), earlyReturn, nextEarlyReturn);
  if (type.type == null)
    throw new SyntaxError(tokens[colonIndex], 'Missing type');

  return {
    variable: { name: name, type: type.type, modifier },
    endAt: colonIndex + type.endAt + 1,
  };
}

function convertType(type: Type, isFunctionArgs = false, isFunctionReturned = false): string {
  if ('parentType' in type) {
    // ArrayType
    return `${convertType(type.parentType)}[]` + (type.nullable ? '?' : '');
  } else if ('args' in type) {
    // FunctionType
    return convertFunctionType(type);
  } else if ('params' in type) {
    // GenericsType
    return convertGenericsType(type);
  } else if ('types' in type) {
    // TupleType
    if (type.types.length === 0) {
      return 'Tuple' + (type.nullable ? '?' : '');
    } else if (type.types.length === 1) {
      if ('name' in type.types[0])
        return `Tuple<${convertType(type.types[0].type)}>` + (type.nullable ? '?' : '');
      else
        return `Tuple<${convertType(type.types[0])}>` + (type.nullable ? '?' : '');
    }
    return `(${type.types.map(x => {
      if ('name' in x)
        return `${convertType(x.type)} ${x.name}`;
      else
        return convertType(x);
    }).join(', ')})${type.nullable ? '?' : ''}`;
  } else {
    // NormalType
    if (isFunctionArgs && type.type === '_')
      return '';
    else if (isFunctionReturned && type.type === '_')
      return 'void';
    else
      return convertQualifiedNames(type.qualifiedNames) + type.type + (type.nullable ? '?' : '');
  }

  function convertFunctionType(type: FunctionType): string {
    if ('type' in type.returned && (type.returned.type === 'void' || type.returned.type === '_')) {
      if (type.args.length === 0)
        return `Action` + (type.nullable ? '?' : '');
      return `Action<${type.args.map(x => convertType(x.type, true, false)).join(', ')}>${type.nullable ? '?' : ''}`;
    } else {
      if (type.args.length === 0)
        return `Func<${convertType(type.returned, false, true)}>${type.nullable ? '?' : ''}`;
      return `Func<${type.args.map(x => convertType(x.type, true, false)).join(', ')}, ${convertType(type.returned, false, true)}>${type.nullable ? '?' : ''}`;
    }
  }
  function convertGenericsType(type: GenericsType): string {
    return `${convertQualifiedNames(type.qualifiedNames) + convertType(type.type).replace('?', '')}<${type.params.map(x => convertType(x)).join(', ')}>${type.nullable ? '?' : ''}`;
  }
  function convertQualifiedNames(qualifiedNames: QualifiedName[] | undefined): string {
    if (qualifiedNames === undefined)
      return '';
    return qualifiedNames.map(x => `${'params' in x.name ? convertGenericsType(x.name) : x.name.type}${x.accessor}`).join('');
  }
}

/**
 * @param tokens categoryがspace, line_break, commentのトークンは事前に削除されていること
 */
function parseType(tokens: BaseToken[], earlyReturn: boolean, nextEarlyReturn: boolean, inGenerics = false): {
  type: Type | null;
  endAt: number
} {
  let type: Type | null = null;
  let typeType: 'normal' | 'array' | 'function' | 'generics' | 'tuple' | null = null;
  if (tokens.length === 0) {
    return {
      type: null,
      endAt: 0
    };
  }
  if (tokens.length === 1) {
    if (tokens[0].category !== 'context_keyword' && tokens[0].category !== 'keyword' && tokens[0].category !== undefined)
      throw new SyntaxError(tokens[0]);
    changeKind(tokens[0], 'name.other');
    return {
      type: { type: tokens[0].text } as NormalType,
      endAt: 1
    };
  }
  if (tokens.find(x => isAccessor(x.text) === false && x.category !== 'keyword' && x.category !== 'context_keyword') === undefined) {
    tokens.forEach(x => changeKind(x, 'name.other'));
    return {
      type: { type: tokens.map(x => x.text).join('') } as NormalType,
      endAt: tokens.length
    };
  }

  let qualifiedNamesOfType: QualifiedName[] = [];

  let i = 0;
  let latestTypeStartToken: BaseToken | null = null;
  let tupleStartToken: BaseToken | null = null;
  while (i < tokens.length) {
    const current = tokens[i];
    if (current.text === '(' && current.category === 'operator') {
      if (typeType !== null && typeType !== 'tuple' && (tokens.length !== 0 && isAccessor(tokens[i + 1].text)) === false) {
        throw new SyntaxError(current);
      }

      let parenthesesCount = 1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].text === '(' && tokens[j].category === 'operator') {
          parenthesesCount++;
        } else if (tokens[j].text === ')' && tokens[j].category === 'operator') {
          parenthesesCount--;
          if (parenthesesCount === 0) {
            if (j === i + 1) {
              throw new SyntaxError({ content: '()', start: tokens[i].start, end: tokens[i].start + 1 }, 'Cannot have empty parentheses');
            }
            const innerType = parseType(tokens.slice(i + 1, j), false, nextEarlyReturn);
            if (tokens.length > j + 1 && isAccessor(tokens[j + 1].text)) {
              if (innerType.type !== null && 'type' in innerType.type) {
                latestTypeStartToken ??= tokens[i];
                qualifiedNamesOfType.push({ name: innerType.type, accessor: tokens[j + 1].text as '.' | '?.' | '!.', nameToken: tokens[i + 1], accessorToken: tokens[j + 1] });
                i = j + 2;
              } else {
                throw new SyntaxError(tokens[j + 1]);
              }
            } else {
              if (typeType === null) {
                type = innerType.type;
                latestTypeStartToken = tokens[i];
              } else if (typeType === 'tuple') {
                if (innerType.type === null)
                  throw new SyntaxError(tokens[j + 1]);
                (type as TupleType).types.push(innerType.type);
              }
              i = j + 1;
            }
            if (tokens.length > j + 1 && tokens[j + 1].text === '?') {
              if (type === null)
                throw new SyntaxError(tokens[j + 1]);
              type.nullable = true;
              i++;
            }
            break;
          }
        }
        if (j === tokens.length - 1) {
          throw new SyntaxError(tokens[j]);
        }
      }
    } else if (current.category === 'operator') {
      if (current.text === '?') {
        if (type === null)
          throw new SyntaxError(current);
        if (typeType === 'tuple') {
          if ('name' in (type as TupleType).types[(type as TupleType).types.length - 1]) {
            if (((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).type.nullable === true)
              throw new SyntaxError(current);
            ((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).type.nullable = true;
          } else {
            if (((type as TupleType).types[(type as TupleType).types.length - 1] as Type).nullable === true)
              throw new SyntaxError(current);
            ((type as TupleType).types[(type as TupleType).types.length - 1] as Type).nullable = true;
          }
        } else {
          if (type.nullable === true)
            throw new SyntaxError(current);
          type.nullable = true;
        }
        i++;
        continue;
      } else if (current.text === '~') {
        if (earlyReturn) {
          if (typeType === 'tuple' && tupleStartToken !== null) {
            decorations.push({ start: tupleStartToken.start, end: tokens[i - 1].end, kind: 'tuple' });
          }
          break;
        }
        if (typeType === 'tuple') {
          i++;
          continue;
        } else {
          tupleStartToken = latestTypeStartToken;
          type = { types: [type] } as TupleType;
          typeType = 'tuple';
          i++;
          continue;
        }
      } else if (current.text === '#') {
        if (type === null)
          throw new SyntaxError(current);
        type = convertIntoArray(type, typeType);
        if (typeType === 'normal') {
          typeType = 'array';
        }
        i++;
        continue;

        function convertIntoArray(type: Type, typeType: 'normal' | 'array' | 'function' | 'generics' | 'tuple' | null): Type {
          if (typeType === 'normal') {
            type = { parentType: type, qualifiedNames: type.qualifiedNames, nullable: type.nullable } as ArrayType;
          } else if (typeType === 'tuple') {
            if ('name' in (type as TupleType).types[(type as TupleType).types.length - 1]) {
              (type as TupleType).types[(type as TupleType).types.length - 1] = { name: ((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).name, type: { parentType: ((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).type, qualifiedNames: ((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).type.qualifiedNames, nullable: ((type as TupleType).types[(type as TupleType).types.length - 1] as Variable).type.nullable } } as Variable;
            } else {
              (type as TupleType).types[(type as TupleType).types.length - 1] = { type: { parentType: (type as TupleType).types[(type as TupleType).types.length - 1] as Type, qualifiedNames: ((type as TupleType).types[(type as TupleType).types.length - 1] as Type).qualifiedNames, nullable: ((type as TupleType).types[(type as TupleType).types.length - 1] as Type).nullable } } as Variable;
            }
          } else if (typeType === 'generics') {
            (type as GenericsType).params[(type as GenericsType).params.length - 1] = { parentType: (type as GenericsType).params[(type as GenericsType).params.length - 1], qualifiedNames: (type as GenericsType).params[(type as GenericsType).params.length - 1].qualifiedNames, nullable: (type as GenericsType).params[(type as GenericsType).params.length - 1].nullable } as ArrayType;
          } else if (typeType === 'function') {
            (type as FunctionType).returned = convertIntoArray((type as FunctionType).returned, 'function');
          } else {
            throw new SyntaxError(current);
          }
          return type;
        }
      } else if (current.text === ',' || current.text === '/' || current.text === '=>' || current.text === '{' || current.text === ';' || current.text === '=') {
        if (typeType === 'tuple' && tupleStartToken !== null) {
          decorations.push({ start: tupleStartToken.start, end: tokens[i - 1].end, kind: 'tuple' });
        }
        break;
      } else {
        throw new SyntaxError(current);
      }
    } else if (i + 1 < tokens.length && isAccessor(tokens[i + 1].text)) {
      if (i + 2 >= tokens.length) {
        throw new SyntaxError(tokens[i + 1]);
      } else if (tokens[i + 2].category !== 'context_keyword' && tokens[i + 2].category !== 'keyword' && tokens[i + 2].category !== undefined && tokens[i + 2].text !== '(') {
        throw new SyntaxError(tokens[i + 2]);
      }
      changeKind(current, 'name.other');
      latestTypeStartToken ??= current;
      qualifiedNamesOfType.push({ name: { type: current.text } as NormalType, accessor: tokens[i + 1].text as '.' | '?.' | '!.', nameToken: current, accessorToken: tokens[i + 1] });
      i += 2;
    }
    else if (current.text === 'fn' && current.category === 'keyword') {
      let nullable = false;
      if (i + 1 < tokens.length && tokens[i + 1].text === '?') {
        nullable = true;
        i++;
      }
      if (i + 2 >= tokens.length) {
        throw new SyntaxError(current);
      } else if (tokens[i + 1].text !== ':' || tokens[i + 1].category !== 'operator') {
        throw new SyntaxError(current, 'Missing colon');
      }
      if (qualifiedNamesOfType.length !== 0) {
        throw new SyntaxError(qualifiedNamesOfType[qualifiedNamesOfType.length - 1].accessorToken);
      }
      const functionType = parseFunctionType(tokens.slice(i + 2), false, false, earlyReturn, nextEarlyReturn);
      if (typeType !== null && typeType !== 'tuple') {
        throw new SyntaxError(tokens[i + 2], 'Unexpected function type');
      }
      decorations.push({ start: current.start, end: tokens[i + 2 + functionType.endAt - 1].end, kind: 'fn-type' });

      if (nullable)
        functionType.type.nullable = true;

      if (typeType === 'tuple') {
        (type as TupleType).types.push(functionType.type);
        i += 2 + functionType.endAt;
      } else {
        latestTypeStartToken = current;
        type = functionType.type;
        typeType = 'function';
        i += 2 + functionType.endAt;
        break;
      }
    } else if (i + 2 < tokens.length && tokens[i + 1].text === '-' && tokens[i + 1].category === 'operator') {
      const genericsType = parseGenericsType(tokens.slice(i), nextEarlyReturn, true, inGenerics);
      if (typeType !== null && typeType !== 'tuple') {
        throw new SyntaxError(tokens[i], 'Unexpected generics type');
      }

      decorations.push({ start: tokens[i + 2].start, end: tokens[i + genericsType.endAt].end, kind: 'generics' });

      genericsType.type.type.type = genericsType.type.type.type;
      if (qualifiedNamesOfType.length !== 0)
        genericsType.type.qualifiedNames = qualifiedNamesOfType;
      if (typeType === 'tuple') {
        (type as TupleType).types.push(genericsType.type);
        i += genericsType.endAt;
      } else {
        latestTypeStartToken = current;
        type = genericsType.type;
        typeType = 'generics';
        i += genericsType.endAt;
        break;
      }
    } else if (i + 2 < tokens.length && tokens[i + 1].text === ':' && tokens[i + 1].category === 'operator') {
      if (qualifiedNamesOfType.length !== 0) {
        throw new SyntaxError(qualifiedNamesOfType[qualifiedNamesOfType.length - 1].accessorToken);
      }
      const tupleVariable = parseVariable(tokens.slice(i), false, true, false);
      if (typeType === 'tuple') {
        (type as TupleType).types.push({ name: tupleVariable.variable?.name ?? '', type: tupleVariable.variable?.type ?? { type: '' } } as Variable);
      } else {
        latestTypeStartToken = current;
        tupleStartToken ??= current;
        type = { types: [{ name: tupleVariable.variable?.name ?? '', type: tupleVariable.variable?.type ?? { type: '' } }] } as TupleType;
        typeType = 'tuple';
      }
      i += tupleVariable.endAt;
    } else if (current.text === 'global') {
      if (i !== 0 || (tokens.length > 2 && tokens[i + 1].text !== '::'))
        throw new SyntaxError(current);
      latestTypeStartToken ??= current;
      qualifiedNamesOfType.push({ name: { type: 'global::' }, accessor: '', nameToken: current, accessorToken: tokens[i + 1] });
      i += 2;
    } else {
      changeKind(current, 'name.other');
      if (typeType === null) {
        if (qualifiedNamesOfType.length !== 0) {
          type = { type: current.text, qualifiedNames: qualifiedNamesOfType } as NormalType;
          qualifiedNamesOfType = [];
        } else {
          latestTypeStartToken = current;
          type = { type: current.text } as NormalType;
        }
        typeType = 'normal';
      } else if (typeType === 'tuple') {
        (type as TupleType).types.push({ type: current.text } as NormalType);
      } else {
        throw new SyntaxError(current);
      }
      i++;
    }
  }

  if (type == null) {
    throw new SyntaxError(tokens[0], 'Missing type');
  }

  if (typeType === 'tuple' && tupleStartToken !== null) {
    decorations.push({ start: tupleStartToken.start, end: tokens[tokens.length - 1].end, kind: 'tuple' });
  }

  return {
    type: type,
    endAt: i
  };
}

function parseFunctionType(tokens: BaseToken[], hasArgsName: Boolean, atFnDeclaration: boolean, earlyReturn: boolean, nextEarlyReturn: boolean) {
  let args: Variable[] | null = [];
  let returned: Type;

  if (tokens.length === 0)
    throw new SyntaxError(null, 'Missing function type');

  let i = 0;
  if (tokens[0].text === '_') {
    if (tokens[1].text !== '=>' || tokens[1].category !== 'operator')
      throw new SyntaxError(tokens[1], 'Unexpected token');
    args = [];
    i++;
  } else {
    while (i < tokens.length) {
      if (hasArgsName) {
        const arg = parseVariable(tokens.slice(i), true, earlyReturn, nextEarlyReturn);
        if (arg.variable == null) {
          if (args.length > 0)
            throw new SyntaxError(tokens[i], 'Unexpected variable');
          args = [];
          i++;
          break;
        }
        args.push(arg.variable);
        i += arg.endAt;
      } else {
        const arg = parseType(tokens.slice(i), earlyReturn, nextEarlyReturn);
        if (arg.type === null)
          throw new SyntaxError(tokens[i], 'Missing type');
        args.push({ name: '', type: arg.type });
        i += arg.endAt;
      }
      if (atFnDeclaration && (i >= tokens.length || ((tokens[i].text === '@' || tokens[i].text === '{') && tokens[i].category === 'operator'))) {
        return {
          type: { args, returned: { type: 'void' } as NormalType },
          endAt: i + 1
        };
      }
      if (tokens[i].text === ',' && tokens[i].category === 'operator') {
        i++;
      } else if (tokens[i].text === '=>' && tokens[i].category === 'operator') {
        break;
      } else {
        throw new SyntaxError(tokens[i]);
      }
    }
  }

  const returnedType = parseType(tokens.slice(i + 1), false, true);
  if (returnedType.type == null)
    throw new SyntaxError(tokens[i + 1], 'Missing returned type');
  returned = returnedType.type;

  return {
    type: { args, returned } as FunctionType,
    endAt: i + returnedType.endAt + 1
  };
}
function parseGenericsType(tokens: BaseToken[], earlyReturn: boolean, nextEarlyReturn: boolean, inGenerics = false) {
  let type: Type;
  let params: Type[] = [];

  if (tokens.length === 0)
    throw new SyntaxError(null, 'Missing type');

  const typeType = parseType(tokens.slice(0, 1), true, true);
  if (typeType.type === null)
    throw new SyntaxError(tokens[0], 'Missing type');
  if ('type' in typeType.type === false || 'params' in typeType.type)
    throw new SyntaxError(tokens[0], 'Unexpected type');
  type = typeType.type;
  if (tokens[1].text !== '-' || tokens[1].category !== 'operator') {
    throw new SyntaxError(tokens[0], 'Missing generics parameter');
  }

  let i = 2;
  while (i < tokens.length) {
    const generics = parseType(tokens.slice(i), false, nextEarlyReturn, true);
    if (generics.type === null)
      throw new SyntaxError(tokens[1], 'Missing generics parameter');
    params.push(generics.type);
    i += generics.endAt;
    if (i >= tokens.length || tokens[i].text !== '/' || (earlyReturn && inGenerics)) {
      break;
    }
    i++;
  }

  return {
    type: { type, params: params } as GenericsType,
    endAt: i
  };
}
