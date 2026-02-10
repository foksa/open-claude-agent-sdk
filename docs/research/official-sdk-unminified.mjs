#!/usr/bin/env node
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 0.2.34

// Want to see the unminified source? We're hiring!
// https://job-boards.greenhouse.io/anthropic/jobs/4816199008
var JK = Object.create;
var {
  getPrototypeOf: GK,
  defineProperty: Y9,
  getOwnPropertyNames: HK,
} = Object;
var BK = Object.prototype.hasOwnProperty;
var K7 = (X, Q, $) => {
  $ = X != null ? JK(GK(X)) : {};
  let Y =
    Q || !X || !X.__esModule
      ? Y9($, "default", { value: X, enumerable: !0 })
      : $;
  for (let W of HK(X))
    if (!BK.call(Y, W)) Y9(Y, W, { get: () => X[W], enumerable: !0 });
  return Y;
};
var P = (X, Q) => () => (Q || X((Q = { exports: {} }).exports, Q), Q.exports);
var U7 = (X, Q) => {
  for (var $ in Q)
    Y9(X, $, {
      get: Q[$],
      enumerable: !0,
      configurable: !0,
      set: (Y) => (Q[$] = () => Y),
    });
};
var zK = Symbol.dispose || Symbol.for("Symbol.dispose"),
  KK = Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose"),
  V7 = (X, Q, $) => {
    if (Q != null) {
      if (typeof Q !== "object" && typeof Q !== "function")
        throw TypeError(
          'Object expected to be assigned to "using" declaration'
        );
      var Y;
      if ($) Y = Q[KK];
      if (Y === void 0) Y = Q[zK];
      if (typeof Y !== "function") throw TypeError("Object not disposable");
      X.push([$, Y, Q]);
    } else if ($) X.push([$]);
    return Q;
  },
  L7 = (X, Q, $) => {
    var Y =
        typeof SuppressedError === "function"
          ? SuppressedError
          : function (G, H, B, z) {
              return (
                (z = Error(B)),
                (z.name = "SuppressedError"),
                (z.error = G),
                (z.suppressed = H),
                z
              );
            },
      W = (G) =>
        (Q = $
          ? new Y(G, Q, "An error was suppressed during disposal")
          : (($ = !0), G)),
      J = (G) => {
        while ((G = X.pop()))
          try {
            var H = G[1] && G[1].call(G[2]);
            if (G[0]) return Promise.resolve(H).then(J, (B) => (W(B), J()));
          } catch (B) {
            W(B);
          }
        if ($) throw Q;
      };
    return J();
  };
var hX = P((JG) => {
  Object.defineProperty(JG, "__esModule", { value: !0 });
  JG.regexpCode =
    JG.getEsmExportName =
    JG.getProperty =
    JG.safeStringify =
    JG.stringify =
    JG.strConcat =
    JG.addCodeArg =
    JG.str =
    JG._ =
    JG.nil =
    JG._Code =
    JG.Name =
    JG.IDENTIFIER =
    JG._CodeOrName =
      void 0;
  class D8 {}
  JG._CodeOrName = D8;
  JG.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class g6 extends D8 {
    constructor(X) {
      super();
      if (!JG.IDENTIFIER.test(X))
        throw Error("CodeGen: name must be a valid identifier");
      this.str = X;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  JG.Name = g6;
  class s0 extends D8 {
    constructor(X) {
      super();
      this._items = typeof X === "string" ? [X] : X;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return !1;
      let X = this._items[0];
      return X === "" || X === '""';
    }
    get str() {
      var X;
      return (X = this._str) !== null && X !== void 0
        ? X
        : (this._str = this._items.reduce((Q, $) => `${Q}${$}`, ""));
    }
    get names() {
      var X;
      return (X = this._names) !== null && X !== void 0
        ? X
        : (this._names = this._items.reduce((Q, $) => {
            if ($ instanceof g6) Q[$.str] = (Q[$.str] || 0) + 1;
            return Q;
          }, {}));
    }
  }
  JG._Code = s0;
  JG.nil = new s0("");
  function YG(X, ...Q) {
    let $ = [X[0]],
      Y = 0;
    while (Y < Q.length) s$($, Q[Y]), $.push(X[++Y]);
    return new s0($);
  }
  JG._ = YG;
  var a$ = new s0("+");
  function WG(X, ...Q) {
    let $ = [fX(X[0])],
      Y = 0;
    while (Y < Q.length) $.push(a$), s$($, Q[Y]), $.push(a$, fX(X[++Y]));
    return ON($), new s0($);
  }
  JG.str = WG;
  function s$(X, Q) {
    if (Q instanceof s0) X.push(...Q._items);
    else if (Q instanceof g6) X.push(Q);
    else X.push(AN(Q));
  }
  JG.addCodeArg = s$;
  function ON(X) {
    let Q = 1;
    while (Q < X.length - 1) {
      if (X[Q] === a$) {
        let $ = DN(X[Q - 1], X[Q + 1]);
        if ($ !== void 0) {
          X.splice(Q - 1, 3, $);
          continue;
        }
        X[Q++] = "+";
      }
      Q++;
    }
  }
  function DN(X, Q) {
    if (Q === '""') return X;
    if (X === '""') return Q;
    if (typeof X == "string") {
      if (Q instanceof g6 || X[X.length - 1] !== '"') return;
      if (typeof Q != "string") return `${X.slice(0, -1)}${Q}"`;
      if (Q[0] === '"') return X.slice(0, -1) + Q.slice(1);
      return;
    }
    if (typeof Q == "string" && Q[0] === '"' && !(X instanceof g6))
      return `"${X}${Q.slice(1)}`;
    return;
  }
  function wN(X, Q) {
    return Q.emptyStr() ? X : X.emptyStr() ? Q : WG`${X}${Q}`;
  }
  JG.strConcat = wN;
  function AN(X) {
    return typeof X == "number" || typeof X == "boolean" || X === null
      ? X
      : fX(Array.isArray(X) ? X.join(",") : X);
  }
  function MN(X) {
    return new s0(fX(X));
  }
  JG.stringify = MN;
  function fX(X) {
    return JSON.stringify(X)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  JG.safeStringify = fX;
  function jN(X) {
    return typeof X == "string" && JG.IDENTIFIER.test(X)
      ? new s0(`.${X}`)
      : YG`[${X}]`;
  }
  JG.getProperty = jN;
  function RN(X) {
    if (typeof X == "string" && JG.IDENTIFIER.test(X)) return new s0(`${X}`);
    throw Error(
      `CodeGen: invalid export name: ${X}, use explicit $id name mapping`
    );
  }
  JG.getEsmExportName = RN;
  function IN(X) {
    return new s0(X.toString());
  }
  JG.regexpCode = IN;
});
var $Y = P((zG) => {
  Object.defineProperty(zG, "__esModule", { value: !0 });
  zG.ValueScope =
    zG.ValueScopeName =
    zG.Scope =
    zG.varKinds =
    zG.UsedValueState =
      void 0;
  var x0 = hX();
  class HG extends Error {
    constructor(X) {
      super(`CodeGen: "code" for ${X} not defined`);
      this.value = X.value;
    }
  }
  var A8;
  (function (X) {
    (X[(X.Started = 0)] = "Started"), (X[(X.Completed = 1)] = "Completed");
  })(A8 || (zG.UsedValueState = A8 = {}));
  zG.varKinds = {
    const: new x0.Name("const"),
    let: new x0.Name("let"),
    var: new x0.Name("var"),
  };
  class XY {
    constructor({ prefixes: X, parent: Q } = {}) {
      (this._names = {}), (this._prefixes = X), (this._parent = Q);
    }
    toName(X) {
      return X instanceof x0.Name ? X : this.name(X);
    }
    name(X) {
      return new x0.Name(this._newName(X));
    }
    _newName(X) {
      let Q = this._names[X] || this._nameGroup(X);
      return `${X}${Q.index++}`;
    }
    _nameGroup(X) {
      var Q, $;
      if (
        (($ =
          (Q = this._parent) === null || Q === void 0
            ? void 0
            : Q._prefixes) === null || $ === void 0
          ? void 0
          : $.has(X)) ||
        (this._prefixes && !this._prefixes.has(X))
      )
        throw Error(`CodeGen: prefix "${X}" is not allowed in this scope`);
      return (this._names[X] = { prefix: X, index: 0 });
    }
  }
  zG.Scope = XY;
  class QY extends x0.Name {
    constructor(X, Q) {
      super(Q);
      this.prefix = X;
    }
    setValue(X, { property: Q, itemIndex: $ }) {
      (this.value = X), (this.scopePath = x0._`.${new x0.Name(Q)}[${$}]`);
    }
  }
  zG.ValueScopeName = QY;
  var gN = x0._`\n`;
  class BG extends XY {
    constructor(X) {
      super(X);
      (this._values = {}),
        (this._scope = X.scope),
        (this.opts = { ...X, _n: X.lines ? gN : x0.nil });
    }
    get() {
      return this._scope;
    }
    name(X) {
      return new QY(X, this._newName(X));
    }
    value(X, Q) {
      var $;
      if (Q.ref === void 0) throw Error("CodeGen: ref must be passed in value");
      let Y = this.toName(X),
        { prefix: W } = Y,
        J = ($ = Q.key) !== null && $ !== void 0 ? $ : Q.ref,
        G = this._values[W];
      if (G) {
        let z = G.get(J);
        if (z) return z;
      } else G = this._values[W] = new Map();
      G.set(J, Y);
      let H = this._scope[W] || (this._scope[W] = []),
        B = H.length;
      return (H[B] = Q.ref), Y.setValue(Q, { property: W, itemIndex: B }), Y;
    }
    getValue(X, Q) {
      let $ = this._values[X];
      if (!$) return;
      return $.get(Q);
    }
    scopeRefs(X, Q = this._values) {
      return this._reduceValues(Q, ($) => {
        if ($.scopePath === void 0)
          throw Error(`CodeGen: name "${$}" has no value`);
        return x0._`${X}${$.scopePath}`;
      });
    }
    scopeCode(X = this._values, Q, $) {
      return this._reduceValues(
        X,
        (Y) => {
          if (Y.value === void 0)
            throw Error(`CodeGen: name "${Y}" has no value`);
          return Y.value.code;
        },
        Q,
        $
      );
    }
    _reduceValues(X, Q, $ = {}, Y) {
      let W = x0.nil;
      for (let J in X) {
        let G = X[J];
        if (!G) continue;
        let H = ($[J] = $[J] || new Map());
        G.forEach((B) => {
          if (H.has(B)) return;
          H.set(B, A8.Started);
          let z = Q(B);
          if (z) {
            let K = this.opts.es5 ? zG.varKinds.var : zG.varKinds.const;
            W = x0._`${W}${K} ${B} = ${z};${this.opts._n}`;
          } else if ((z = Y === null || Y === void 0 ? void 0 : Y(B)))
            W = x0._`${W}${z}${this.opts._n}`;
          else throw new HG(B);
          H.set(B, A8.Completed);
        });
      }
      return W;
    }
  }
  zG.ValueScope = BG;
});
var p = P((y0) => {
  Object.defineProperty(y0, "__esModule", { value: !0 });
  y0.or =
    y0.and =
    y0.not =
    y0.CodeGen =
    y0.operators =
    y0.varKinds =
    y0.ValueScopeName =
    y0.ValueScope =
    y0.Scope =
    y0.Name =
    y0.regexpCode =
    y0.stringify =
    y0.getProperty =
    y0.nil =
    y0.strConcat =
    y0.str =
    y0._ =
      void 0;
  var t = hX(),
    e0 = $Y(),
    l1 = hX();
  Object.defineProperty(y0, "_", {
    enumerable: !0,
    get: function () {
      return l1._;
    },
  });
  Object.defineProperty(y0, "str", {
    enumerable: !0,
    get: function () {
      return l1.str;
    },
  });
  Object.defineProperty(y0, "strConcat", {
    enumerable: !0,
    get: function () {
      return l1.strConcat;
    },
  });
  Object.defineProperty(y0, "nil", {
    enumerable: !0,
    get: function () {
      return l1.nil;
    },
  });
  Object.defineProperty(y0, "getProperty", {
    enumerable: !0,
    get: function () {
      return l1.getProperty;
    },
  });
  Object.defineProperty(y0, "stringify", {
    enumerable: !0,
    get: function () {
      return l1.stringify;
    },
  });
  Object.defineProperty(y0, "regexpCode", {
    enumerable: !0,
    get: function () {
      return l1.regexpCode;
    },
  });
  Object.defineProperty(y0, "Name", {
    enumerable: !0,
    get: function () {
      return l1.Name;
    },
  });
  var b8 = $Y();
  Object.defineProperty(y0, "Scope", {
    enumerable: !0,
    get: function () {
      return b8.Scope;
    },
  });
  Object.defineProperty(y0, "ValueScope", {
    enumerable: !0,
    get: function () {
      return b8.ValueScope;
    },
  });
  Object.defineProperty(y0, "ValueScopeName", {
    enumerable: !0,
    get: function () {
      return b8.ValueScopeName;
    },
  });
  Object.defineProperty(y0, "varKinds", {
    enumerable: !0,
    get: function () {
      return b8.varKinds;
    },
  });
  y0.operators = {
    GT: new t._Code(">"),
    GTE: new t._Code(">="),
    LT: new t._Code("<"),
    LTE: new t._Code("<="),
    EQ: new t._Code("==="),
    NEQ: new t._Code("!=="),
    NOT: new t._Code("!"),
    OR: new t._Code("||"),
    AND: new t._Code("&&"),
    ADD: new t._Code("+"),
  };
  class m1 {
    optimizeNodes() {
      return this;
    }
    optimizeNames(X, Q) {
      return this;
    }
  }
  class UG extends m1 {
    constructor(X, Q, $) {
      super();
      (this.varKind = X), (this.name = Q), (this.rhs = $);
    }
    render({ es5: X, _n: Q }) {
      let $ = X ? e0.varKinds.var : this.varKind,
        Y = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${$} ${this.name}${Y};` + Q;
    }
    optimizeNames(X, Q) {
      if (!X[this.name.str]) return;
      if (this.rhs) this.rhs = h6(this.rhs, X, Q);
      return this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class JY extends m1 {
    constructor(X, Q, $) {
      super();
      (this.lhs = X), (this.rhs = Q), (this.sideEffects = $);
    }
    render({ _n: X }) {
      return `${this.lhs} = ${this.rhs};` + X;
    }
    optimizeNames(X, Q) {
      if (this.lhs instanceof t.Name && !X[this.lhs.str] && !this.sideEffects)
        return;
      return (this.rhs = h6(this.rhs, X, Q)), this;
    }
    get names() {
      let X = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return E8(X, this.rhs);
    }
  }
  class VG extends JY {
    constructor(X, Q, $, Y) {
      super(X, $, Y);
      this.op = Q;
    }
    render({ _n: X }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + X;
    }
  }
  class LG extends m1 {
    constructor(X) {
      super();
      (this.label = X), (this.names = {});
    }
    render({ _n: X }) {
      return `${this.label}:` + X;
    }
  }
  class qG extends m1 {
    constructor(X) {
      super();
      (this.label = X), (this.names = {});
    }
    render({ _n: X }) {
      return `break${this.label ? ` ${this.label}` : ""};` + X;
    }
  }
  class FG extends m1 {
    constructor(X) {
      super();
      this.error = X;
    }
    render({ _n: X }) {
      return `throw ${this.error};` + X;
    }
    get names() {
      return this.error.names;
    }
  }
  class NG extends m1 {
    constructor(X) {
      super();
      this.code = X;
    }
    render({ _n: X }) {
      return `${this.code};` + X;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(X, Q) {
      return (this.code = h6(this.code, X, Q)), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class P8 extends m1 {
    constructor(X = []) {
      super();
      this.nodes = X;
    }
    render(X) {
      return this.nodes.reduce((Q, $) => Q + $.render(X), "");
    }
    optimizeNodes() {
      let { nodes: X } = this,
        Q = X.length;
      while (Q--) {
        let $ = X[Q].optimizeNodes();
        if (Array.isArray($)) X.splice(Q, 1, ...$);
        else if ($) X[Q] = $;
        else X.splice(Q, 1);
      }
      return X.length > 0 ? this : void 0;
    }
    optimizeNames(X, Q) {
      let { nodes: $ } = this,
        Y = $.length;
      while (Y--) {
        let W = $[Y];
        if (W.optimizeNames(X, Q)) continue;
        lN(X, W.names), $.splice(Y, 1);
      }
      return $.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((X, Q) => G6(X, Q.names), {});
    }
  }
  class c1 extends P8 {
    render(X) {
      return "{" + X._n + super.render(X) + "}" + X._n;
    }
  }
  class OG extends P8 {}
  class uX extends c1 {}
  uX.kind = "else";
  class j1 extends c1 {
    constructor(X, Q) {
      super(Q);
      this.condition = X;
    }
    render(X) {
      let Q = `if(${this.condition})` + super.render(X);
      if (this.else) Q += "else " + this.else.render(X);
      return Q;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let X = this.condition;
      if (X === !0) return this.nodes;
      let Q = this.else;
      if (Q) {
        let $ = Q.optimizeNodes();
        Q = this.else = Array.isArray($) ? new uX($) : $;
      }
      if (Q) {
        if (X === !1) return Q instanceof j1 ? Q : Q.nodes;
        if (this.nodes.length) return this;
        return new j1(jG(X), Q instanceof j1 ? [Q] : Q.nodes);
      }
      if (X === !1 || !this.nodes.length) return;
      return this;
    }
    optimizeNames(X, Q) {
      var $;
      if (
        ((this.else =
          ($ = this.else) === null || $ === void 0
            ? void 0
            : $.optimizeNames(X, Q)),
        !(super.optimizeNames(X, Q) || this.else))
      )
        return;
      return (this.condition = h6(this.condition, X, Q)), this;
    }
    get names() {
      let X = super.names;
      if ((E8(X, this.condition), this.else)) G6(X, this.else.names);
      return X;
    }
  }
  j1.kind = "if";
  class f6 extends c1 {}
  f6.kind = "for";
  class DG extends f6 {
    constructor(X) {
      super();
      this.iteration = X;
    }
    render(X) {
      return `for(${this.iteration})` + super.render(X);
    }
    optimizeNames(X, Q) {
      if (!super.optimizeNames(X, Q)) return;
      return (this.iteration = h6(this.iteration, X, Q)), this;
    }
    get names() {
      return G6(super.names, this.iteration.names);
    }
  }
  class wG extends f6 {
    constructor(X, Q, $, Y) {
      super();
      (this.varKind = X), (this.name = Q), (this.from = $), (this.to = Y);
    }
    render(X) {
      let Q = X.es5 ? e0.varKinds.var : this.varKind,
        { name: $, from: Y, to: W } = this;
      return `for(${Q} ${$}=${Y}; ${$}<${W}; ${$}++)` + super.render(X);
    }
    get names() {
      let X = E8(super.names, this.from);
      return E8(X, this.to);
    }
  }
  class YY extends f6 {
    constructor(X, Q, $, Y) {
      super();
      (this.loop = X), (this.varKind = Q), (this.name = $), (this.iterable = Y);
    }
    render(X) {
      return (
        `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` +
        super.render(X)
      );
    }
    optimizeNames(X, Q) {
      if (!super.optimizeNames(X, Q)) return;
      return (this.iterable = h6(this.iterable, X, Q)), this;
    }
    get names() {
      return G6(super.names, this.iterable.names);
    }
  }
  class M8 extends c1 {
    constructor(X, Q, $) {
      super();
      (this.name = X), (this.args = Q), (this.async = $);
    }
    render(X) {
      return (
        `${this.async ? "async " : ""}function ${this.name}(${this.args})` +
        super.render(X)
      );
    }
  }
  M8.kind = "func";
  class j8 extends P8 {
    render(X) {
      return "return " + super.render(X);
    }
  }
  j8.kind = "return";
  class AG extends c1 {
    render(X) {
      let Q = "try" + super.render(X);
      if (this.catch) Q += this.catch.render(X);
      if (this.finally) Q += this.finally.render(X);
      return Q;
    }
    optimizeNodes() {
      var X, Q;
      return (
        super.optimizeNodes(),
        (X = this.catch) === null || X === void 0 || X.optimizeNodes(),
        (Q = this.finally) === null || Q === void 0 || Q.optimizeNodes(),
        this
      );
    }
    optimizeNames(X, Q) {
      var $, Y;
      return (
        super.optimizeNames(X, Q),
        ($ = this.catch) === null || $ === void 0 || $.optimizeNames(X, Q),
        (Y = this.finally) === null || Y === void 0 || Y.optimizeNames(X, Q),
        this
      );
    }
    get names() {
      let X = super.names;
      if (this.catch) G6(X, this.catch.names);
      if (this.finally) G6(X, this.finally.names);
      return X;
    }
  }
  class R8 extends c1 {
    constructor(X) {
      super();
      this.error = X;
    }
    render(X) {
      return `catch(${this.error})` + super.render(X);
    }
  }
  R8.kind = "catch";
  class I8 extends c1 {
    render(X) {
      return "finally" + super.render(X);
    }
  }
  I8.kind = "finally";
  class MG {
    constructor(X, Q = {}) {
      (this._values = {}),
        (this._blockStarts = []),
        (this._constants = {}),
        (this.opts = {
          ...Q,
          _n: Q.lines
            ? `
`
            : "",
        }),
        (this._extScope = X),
        (this._scope = new e0.Scope({ parent: X })),
        (this._nodes = [new OG()]);
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(X) {
      return this._scope.name(X);
    }
    scopeName(X) {
      return this._extScope.name(X);
    }
    scopeValue(X, Q) {
      let $ = this._extScope.value(X, Q);
      return (
        (this._values[$.prefix] || (this._values[$.prefix] = new Set())).add($),
        $
      );
    }
    getScopeValue(X, Q) {
      return this._extScope.getValue(X, Q);
    }
    scopeRefs(X) {
      return this._extScope.scopeRefs(X, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(X, Q, $, Y) {
      let W = this._scope.toName(Q);
      if ($ !== void 0 && Y) this._constants[W.str] = $;
      return this._leafNode(new UG(X, W, $)), W;
    }
    const(X, Q, $) {
      return this._def(e0.varKinds.const, X, Q, $);
    }
    let(X, Q, $) {
      return this._def(e0.varKinds.let, X, Q, $);
    }
    var(X, Q, $) {
      return this._def(e0.varKinds.var, X, Q, $);
    }
    assign(X, Q, $) {
      return this._leafNode(new JY(X, Q, $));
    }
    add(X, Q) {
      return this._leafNode(new VG(X, y0.operators.ADD, Q));
    }
    code(X) {
      if (typeof X == "function") X();
      else if (X !== t.nil) this._leafNode(new NG(X));
      return this;
    }
    object(...X) {
      let Q = ["{"];
      for (let [$, Y] of X) {
        if (Q.length > 1) Q.push(",");
        if ((Q.push($), $ !== Y || this.opts.es5))
          Q.push(":"), (0, t.addCodeArg)(Q, Y);
      }
      return Q.push("}"), new t._Code(Q);
    }
    if(X, Q, $) {
      if ((this._blockNode(new j1(X)), Q && $))
        this.code(Q).else().code($).endIf();
      else if (Q) this.code(Q).endIf();
      else if ($) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(X) {
      return this._elseNode(new j1(X));
    }
    else() {
      return this._elseNode(new uX());
    }
    endIf() {
      return this._endBlockNode(j1, uX);
    }
    _for(X, Q) {
      if ((this._blockNode(X), Q)) this.code(Q).endFor();
      return this;
    }
    for(X, Q) {
      return this._for(new DG(X), Q);
    }
    forRange(
      X,
      Q,
      $,
      Y,
      W = this.opts.es5 ? e0.varKinds.var : e0.varKinds.let
    ) {
      let J = this._scope.toName(X);
      return this._for(new wG(W, J, Q, $), () => Y(J));
    }
    forOf(X, Q, $, Y = e0.varKinds.const) {
      let W = this._scope.toName(X);
      if (this.opts.es5) {
        let J = Q instanceof t.Name ? Q : this.var("_arr", Q);
        return this.forRange("_i", 0, t._`${J}.length`, (G) => {
          this.var(W, t._`${J}[${G}]`), $(W);
        });
      }
      return this._for(new YY("of", Y, W, Q), () => $(W));
    }
    forIn(X, Q, $, Y = this.opts.es5 ? e0.varKinds.var : e0.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(X, t._`Object.keys(${Q})`, $);
      let W = this._scope.toName(X);
      return this._for(new YY("in", Y, W, Q), () => $(W));
    }
    endFor() {
      return this._endBlockNode(f6);
    }
    label(X) {
      return this._leafNode(new LG(X));
    }
    break(X) {
      return this._leafNode(new qG(X));
    }
    return(X) {
      let Q = new j8();
      if ((this._blockNode(Q), this.code(X), Q.nodes.length !== 1))
        throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(j8);
    }
    try(X, Q, $) {
      if (!Q && !$) throw Error('CodeGen: "try" without "catch" and "finally"');
      let Y = new AG();
      if ((this._blockNode(Y), this.code(X), Q)) {
        let W = this.name("e");
        (this._currNode = Y.catch = new R8(W)), Q(W);
      }
      if ($) (this._currNode = Y.finally = new I8()), this.code($);
      return this._endBlockNode(R8, I8);
    }
    throw(X) {
      return this._leafNode(new FG(X));
    }
    block(X, Q) {
      if ((this._blockStarts.push(this._nodes.length), X))
        this.code(X).endBlock(Q);
      return this;
    }
    endBlock(X) {
      let Q = this._blockStarts.pop();
      if (Q === void 0) throw Error("CodeGen: not in self-balancing block");
      let $ = this._nodes.length - Q;
      if ($ < 0 || (X !== void 0 && $ !== X))
        throw Error(`CodeGen: wrong number of nodes: ${$} vs ${X} expected`);
      return (this._nodes.length = Q), this;
    }
    func(X, Q = t.nil, $, Y) {
      if ((this._blockNode(new M8(X, Q, $)), Y)) this.code(Y).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(M8);
    }
    optimize(X = 1) {
      while (X-- > 0)
        this._root.optimizeNodes(),
          this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(X) {
      return this._currNode.nodes.push(X), this;
    }
    _blockNode(X) {
      this._currNode.nodes.push(X), this._nodes.push(X);
    }
    _endBlockNode(X, Q) {
      let $ = this._currNode;
      if ($ instanceof X || (Q && $ instanceof Q))
        return this._nodes.pop(), this;
      throw Error(
        `CodeGen: not in block "${Q ? `${X.kind}/${Q.kind}` : X.kind}"`
      );
    }
    _elseNode(X) {
      let Q = this._currNode;
      if (!(Q instanceof j1)) throw Error('CodeGen: "else" without "if"');
      return (this._currNode = Q.else = X), this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let X = this._nodes;
      return X[X.length - 1];
    }
    set _currNode(X) {
      let Q = this._nodes;
      Q[Q.length - 1] = X;
    }
  }
  y0.CodeGen = MG;
  function G6(X, Q) {
    for (let $ in Q) X[$] = (X[$] || 0) + (Q[$] || 0);
    return X;
  }
  function E8(X, Q) {
    return Q instanceof t._CodeOrName ? G6(X, Q.names) : X;
  }
  function h6(X, Q, $) {
    if (X instanceof t.Name) return Y(X);
    if (!W(X)) return X;
    return new t._Code(
      X._items.reduce((J, G) => {
        if (G instanceof t.Name) G = Y(G);
        if (G instanceof t._Code) J.push(...G._items);
        else J.push(G);
        return J;
      }, [])
    );
    function Y(J) {
      let G = $[J.str];
      if (G === void 0 || Q[J.str] !== 1) return J;
      return delete Q[J.str], G;
    }
    function W(J) {
      return (
        J instanceof t._Code &&
        J._items.some(
          (G) => G instanceof t.Name && Q[G.str] === 1 && $[G.str] !== void 0
        )
      );
    }
  }
  function lN(X, Q) {
    for (let $ in Q) X[$] = (X[$] || 0) - (Q[$] || 0);
  }
  function jG(X) {
    return typeof X == "boolean" || typeof X == "number" || X === null
      ? !X
      : t._`!${WY(X)}`;
  }
  y0.not = jG;
  var mN = RG(y0.operators.AND);
  function cN(...X) {
    return X.reduce(mN);
  }
  y0.and = cN;
  var pN = RG(y0.operators.OR);
  function dN(...X) {
    return X.reduce(pN);
  }
  y0.or = dN;
  function RG(X) {
    return (Q, $) =>
      Q === t.nil ? $ : $ === t.nil ? Q : t._`${WY(Q)} ${X} ${WY($)}`;
  }
  function WY(X) {
    return X instanceof t.Name ? X : t._`(${X})`;
  }
});
var e = P((vG) => {
  Object.defineProperty(vG, "__esModule", { value: !0 });
  vG.checkStrictMode =
    vG.getErrorPath =
    vG.Type =
    vG.useFunc =
    vG.setEvaluated =
    vG.evaluatedPropsToName =
    vG.mergeEvaluated =
    vG.eachItem =
    vG.unescapeJsonPointer =
    vG.escapeJsonPointer =
    vG.escapeFragment =
    vG.unescapeFragment =
    vG.schemaRefOrVal =
    vG.schemaHasRulesButRef =
    vG.schemaHasRules =
    vG.checkUnknownRules =
    vG.alwaysValidSchema =
    vG.toHash =
      void 0;
  var $0 = p(),
    oN = hX();
  function tN(X) {
    let Q = {};
    for (let $ of X) Q[$] = !0;
    return Q;
  }
  vG.toHash = tN;
  function aN(X, Q) {
    if (typeof Q == "boolean") return Q;
    if (Object.keys(Q).length === 0) return !0;
    return PG(X, Q), !SG(Q, X.self.RULES.all);
  }
  vG.alwaysValidSchema = aN;
  function PG(X, Q = X.schema) {
    let { opts: $, self: Y } = X;
    if (!$.strictSchema) return;
    if (typeof Q === "boolean") return;
    let W = Y.RULES.keywords;
    for (let J in Q) if (!W[J]) kG(X, `unknown keyword: "${J}"`);
  }
  vG.checkUnknownRules = PG;
  function SG(X, Q) {
    if (typeof X == "boolean") return !X;
    for (let $ in X) if (Q[$]) return !0;
    return !1;
  }
  vG.schemaHasRules = SG;
  function sN(X, Q) {
    if (typeof X == "boolean") return !X;
    for (let $ in X) if ($ !== "$ref" && Q.all[$]) return !0;
    return !1;
  }
  vG.schemaHasRulesButRef = sN;
  function eN({ topSchemaRef: X, schemaPath: Q }, $, Y, W) {
    if (!W) {
      if (typeof $ == "number" || typeof $ == "boolean") return $;
      if (typeof $ == "string") return $0._`${$}`;
    }
    return $0._`${X}${Q}${(0, $0.getProperty)(Y)}`;
  }
  vG.schemaRefOrVal = eN;
  function XO(X) {
    return ZG(decodeURIComponent(X));
  }
  vG.unescapeFragment = XO;
  function QO(X) {
    return encodeURIComponent(HY(X));
  }
  vG.escapeFragment = QO;
  function HY(X) {
    if (typeof X == "number") return `${X}`;
    return X.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  vG.escapeJsonPointer = HY;
  function ZG(X) {
    return X.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  vG.unescapeJsonPointer = ZG;
  function $O(X, Q) {
    if (Array.isArray(X)) for (let $ of X) Q($);
    else Q(X);
  }
  vG.eachItem = $O;
  function EG({
    mergeNames: X,
    mergeToName: Q,
    mergeValues: $,
    resultToName: Y,
  }) {
    return (W, J, G, H) => {
      let B =
        G === void 0
          ? J
          : G instanceof $0.Name
          ? (J instanceof $0.Name ? X(W, J, G) : Q(W, J, G), G)
          : J instanceof $0.Name
          ? (Q(W, G, J), J)
          : $(J, G);
      return H === $0.Name && !(B instanceof $0.Name) ? Y(W, B) : B;
    };
  }
  vG.mergeEvaluated = {
    props: EG({
      mergeNames: (X, Q, $) =>
        X.if($0._`${$} !== true && ${Q} !== undefined`, () => {
          X.if(
            $0._`${Q} === true`,
            () => X.assign($, !0),
            () =>
              X.assign($, $0._`${$} || {}`).code(
                $0._`Object.assign(${$}, ${Q})`
              )
          );
        }),
      mergeToName: (X, Q, $) =>
        X.if($0._`${$} !== true`, () => {
          if (Q === !0) X.assign($, !0);
          else X.assign($, $0._`${$} || {}`), BY(X, $, Q);
        }),
      mergeValues: (X, Q) => (X === !0 ? !0 : { ...X, ...Q }),
      resultToName: CG,
    }),
    items: EG({
      mergeNames: (X, Q, $) =>
        X.if($0._`${$} !== true && ${Q} !== undefined`, () =>
          X.assign($, $0._`${Q} === true ? true : ${$} > ${Q} ? ${$} : ${Q}`)
        ),
      mergeToName: (X, Q, $) =>
        X.if($0._`${$} !== true`, () =>
          X.assign($, Q === !0 ? !0 : $0._`${$} > ${Q} ? ${$} : ${Q}`)
        ),
      mergeValues: (X, Q) => (X === !0 ? !0 : Math.max(X, Q)),
      resultToName: (X, Q) => X.var("items", Q),
    }),
  };
  function CG(X, Q) {
    if (Q === !0) return X.var("props", !0);
    let $ = X.var("props", $0._`{}`);
    if (Q !== void 0) BY(X, $, Q);
    return $;
  }
  vG.evaluatedPropsToName = CG;
  function BY(X, Q, $) {
    Object.keys($).forEach((Y) =>
      X.assign($0._`${Q}${(0, $0.getProperty)(Y)}`, !0)
    );
  }
  vG.setEvaluated = BY;
  var bG = {};
  function YO(X, Q) {
    return X.scopeValue("func", {
      ref: Q,
      code: bG[Q.code] || (bG[Q.code] = new oN._Code(Q.code)),
    });
  }
  vG.useFunc = YO;
  var GY;
  (function (X) {
    (X[(X.Num = 0)] = "Num"), (X[(X.Str = 1)] = "Str");
  })(GY || (vG.Type = GY = {}));
  function WO(X, Q, $) {
    if (X instanceof $0.Name) {
      let Y = Q === GY.Num;
      return $
        ? Y
          ? $0._`"[" + ${X} + "]"`
          : $0._`"['" + ${X} + "']"`
        : Y
        ? $0._`"/" + ${X}`
        : $0._`"/" + ${X}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return $ ? (0, $0.getProperty)(X).toString() : "/" + HY(X);
  }
  vG.getErrorPath = WO;
  function kG(X, Q, $ = X.opts.strictSchema) {
    if (!$) return;
    if (((Q = `strict mode: ${Q}`), $ === !0)) throw Error(Q);
    X.self.logger.warn(Q);
  }
  vG.checkStrictMode = kG;
});
var R1 = P((_G) => {
  Object.defineProperty(_G, "__esModule", { value: !0 });
  var S0 = p(),
    jO = {
      data: new S0.Name("data"),
      valCxt: new S0.Name("valCxt"),
      instancePath: new S0.Name("instancePath"),
      parentData: new S0.Name("parentData"),
      parentDataProperty: new S0.Name("parentDataProperty"),
      rootData: new S0.Name("rootData"),
      dynamicAnchors: new S0.Name("dynamicAnchors"),
      vErrors: new S0.Name("vErrors"),
      errors: new S0.Name("errors"),
      this: new S0.Name("this"),
      self: new S0.Name("self"),
      scope: new S0.Name("scope"),
      json: new S0.Name("json"),
      jsonPos: new S0.Name("jsonPos"),
      jsonLen: new S0.Name("jsonLen"),
      jsonPart: new S0.Name("jsonPart"),
    };
  _G.default = jO;
});
var lX = P((fG) => {
  Object.defineProperty(fG, "__esModule", { value: !0 });
  fG.extendErrors =
    fG.resetErrorsCount =
    fG.reportExtraError =
    fG.reportError =
    fG.keyword$DataError =
    fG.keywordError =
      void 0;
  var a = p(),
    Z8 = e(),
    v0 = R1();
  fG.keywordError = {
    message: ({ keyword: X }) => a.str`must pass "${X}" keyword validation`,
  };
  fG.keyword$DataError = {
    message: ({ keyword: X, schemaType: Q }) =>
      Q
        ? a.str`"${X}" keyword must be ${Q} ($data)`
        : a.str`"${X}" keyword is invalid ($data)`,
  };
  function IO(X, Q = fG.keywordError, $, Y) {
    let { it: W } = X,
      { gen: J, compositeRule: G, allErrors: H } = W,
      B = gG(X, Q, $);
    if (Y !== null && Y !== void 0 ? Y : G || H) xG(J, B);
    else yG(W, a._`[${B}]`);
  }
  fG.reportError = IO;
  function EO(X, Q = fG.keywordError, $) {
    let { it: Y } = X,
      { gen: W, compositeRule: J, allErrors: G } = Y,
      H = gG(X, Q, $);
    if ((xG(W, H), !(J || G))) yG(Y, v0.default.vErrors);
  }
  fG.reportExtraError = EO;
  function bO(X, Q) {
    X.assign(v0.default.errors, Q),
      X.if(a._`${v0.default.vErrors} !== null`, () =>
        X.if(
          Q,
          () => X.assign(a._`${v0.default.vErrors}.length`, Q),
          () => X.assign(v0.default.vErrors, null)
        )
      );
  }
  fG.resetErrorsCount = bO;
  function PO({
    gen: X,
    keyword: Q,
    schemaValue: $,
    data: Y,
    errsCount: W,
    it: J,
  }) {
    if (W === void 0) throw Error("ajv implementation error");
    let G = X.name("err");
    X.forRange("i", W, v0.default.errors, (H) => {
      if (
        (X.const(G, a._`${v0.default.vErrors}[${H}]`),
        X.if(a._`${G}.instancePath === undefined`, () =>
          X.assign(
            a._`${G}.instancePath`,
            (0, a.strConcat)(v0.default.instancePath, J.errorPath)
          )
        ),
        X.assign(a._`${G}.schemaPath`, a.str`${J.errSchemaPath}/${Q}`),
        J.opts.verbose)
      )
        X.assign(a._`${G}.schema`, $), X.assign(a._`${G}.data`, Y);
    });
  }
  fG.extendErrors = PO;
  function xG(X, Q) {
    let $ = X.const("err", Q);
    X.if(
      a._`${v0.default.vErrors} === null`,
      () => X.assign(v0.default.vErrors, a._`[${$}]`),
      a._`${v0.default.vErrors}.push(${$})`
    ),
      X.code(a._`${v0.default.errors}++`);
  }
  function yG(X, Q) {
    let { gen: $, validateName: Y, schemaEnv: W } = X;
    if (W.$async) $.throw(a._`new ${X.ValidationError}(${Q})`);
    else $.assign(a._`${Y}.errors`, Q), $.return(!1);
  }
  var H6 = {
    keyword: new a.Name("keyword"),
    schemaPath: new a.Name("schemaPath"),
    params: new a.Name("params"),
    propertyName: new a.Name("propertyName"),
    message: new a.Name("message"),
    schema: new a.Name("schema"),
    parentSchema: new a.Name("parentSchema"),
  };
  function gG(X, Q, $) {
    let { createErrors: Y } = X.it;
    if (Y === !1) return a._`{}`;
    return SO(X, Q, $);
  }
  function SO(X, Q, $ = {}) {
    let { gen: Y, it: W } = X,
      J = [ZO(W, $), CO(X, $)];
    return kO(X, Q, J), Y.object(...J);
  }
  function ZO({ errorPath: X }, { instancePath: Q }) {
    let $ = Q ? a.str`${X}${(0, Z8.getErrorPath)(Q, Z8.Type.Str)}` : X;
    return [
      v0.default.instancePath,
      (0, a.strConcat)(v0.default.instancePath, $),
    ];
  }
  function CO(
    { keyword: X, it: { errSchemaPath: Q } },
    { schemaPath: $, parentSchema: Y }
  ) {
    let W = Y ? Q : a.str`${Q}/${X}`;
    if ($) W = a.str`${W}${(0, Z8.getErrorPath)($, Z8.Type.Str)}`;
    return [H6.schemaPath, W];
  }
  function kO(X, { params: Q, message: $ }, Y) {
    let { keyword: W, data: J, schemaValue: G, it: H } = X,
      { opts: B, propertyName: z, topSchemaRef: K, schemaPath: V } = H;
    if (
      (Y.push(
        [H6.keyword, W],
        [H6.params, typeof Q == "function" ? Q(X) : Q || a._`{}`]
      ),
      B.messages)
    )
      Y.push([H6.message, typeof $ == "function" ? $(X) : $]);
    if (B.verbose)
      Y.push(
        [H6.schema, G],
        [H6.parentSchema, a._`${K}${V}`],
        [v0.default.data, J]
      );
    if (z) Y.push([H6.propertyName, z]);
  }
});
var cG = P((lG) => {
  Object.defineProperty(lG, "__esModule", { value: !0 });
  lG.boolOrEmptySchema = lG.topBoolOrEmptySchema = void 0;
  var yO = lX(),
    gO = p(),
    fO = R1(),
    hO = { message: "boolean schema is false" };
  function uO(X) {
    let { gen: Q, schema: $, validateName: Y } = X;
    if ($ === !1) uG(X, !1);
    else if (typeof $ == "object" && $.$async === !0) Q.return(fO.default.data);
    else Q.assign(gO._`${Y}.errors`, null), Q.return(!0);
  }
  lG.topBoolOrEmptySchema = uO;
  function lO(X, Q) {
    let { gen: $, schema: Y } = X;
    if (Y === !1) $.var(Q, !1), uG(X);
    else $.var(Q, !0);
  }
  lG.boolOrEmptySchema = lO;
  function uG(X, Q) {
    let { gen: $, data: Y } = X,
      W = {
        gen: $,
        keyword: "false schema",
        data: Y,
        schema: !1,
        schemaCode: !1,
        schemaValue: !1,
        params: {},
        it: X,
      };
    (0, yO.reportError)(W, hO, void 0, Q);
  }
});
var KY = P((pG) => {
  Object.defineProperty(pG, "__esModule", { value: !0 });
  pG.getRules = pG.isJSONType = void 0;
  var cO = [
      "string",
      "number",
      "integer",
      "boolean",
      "null",
      "object",
      "array",
    ],
    pO = new Set(cO);
  function dO(X) {
    return typeof X == "string" && pO.has(X);
  }
  pG.isJSONType = dO;
  function iO() {
    let X = {
      number: { type: "number", rules: [] },
      string: { type: "string", rules: [] },
      array: { type: "array", rules: [] },
      object: { type: "object", rules: [] },
    };
    return {
      types: { ...X, integer: !0, boolean: !0, null: !0 },
      rules: [{ rules: [] }, X.number, X.string, X.array, X.object],
      post: { rules: [] },
      all: {},
      keywords: {},
    };
  }
  pG.getRules = iO;
});
var UY = P((rG) => {
  Object.defineProperty(rG, "__esModule", { value: !0 });
  rG.shouldUseRule = rG.shouldUseGroup = rG.schemaHasRulesForType = void 0;
  function rO({ schema: X, self: Q }, $) {
    let Y = Q.RULES.types[$];
    return Y && Y !== !0 && iG(X, Y);
  }
  rG.schemaHasRulesForType = rO;
  function iG(X, Q) {
    return Q.rules.some(($) => nG(X, $));
  }
  rG.shouldUseGroup = iG;
  function nG(X, Q) {
    var $;
    return (
      X[Q.keyword] !== void 0 ||
      (($ = Q.definition.implements) === null || $ === void 0
        ? void 0
        : $.some((Y) => X[Y] !== void 0))
    );
  }
  rG.shouldUseRule = nG;
});
var mX = P((eG) => {
  Object.defineProperty(eG, "__esModule", { value: !0 });
  eG.reportTypeError =
    eG.checkDataTypes =
    eG.checkDataType =
    eG.coerceAndCheckDataType =
    eG.getJSONTypes =
    eG.getSchemaTypes =
    eG.DataType =
      void 0;
  var aO = KY(),
    sO = UY(),
    eO = lX(),
    m = p(),
    tG = e(),
    u6;
  (function (X) {
    (X[(X.Correct = 0)] = "Correct"), (X[(X.Wrong = 1)] = "Wrong");
  })(u6 || (eG.DataType = u6 = {}));
  function XD(X) {
    let Q = aG(X.type);
    if (Q.includes("null")) {
      if (X.nullable === !1)
        throw Error("type: null contradicts nullable: false");
    } else {
      if (!Q.length && X.nullable !== void 0)
        throw Error('"nullable" cannot be used without "type"');
      if (X.nullable === !0) Q.push("null");
    }
    return Q;
  }
  eG.getSchemaTypes = XD;
  function aG(X) {
    let Q = Array.isArray(X) ? X : X ? [X] : [];
    if (Q.every(aO.isJSONType)) return Q;
    throw Error("type must be JSONType or JSONType[]: " + Q.join(","));
  }
  eG.getJSONTypes = aG;
  function QD(X, Q) {
    let { gen: $, data: Y, opts: W } = X,
      J = $D(Q, W.coerceTypes),
      G =
        Q.length > 0 &&
        !(
          J.length === 0 &&
          Q.length === 1 &&
          (0, sO.schemaHasRulesForType)(X, Q[0])
        );
    if (G) {
      let H = LY(Q, Y, W.strictNumbers, u6.Wrong);
      $.if(H, () => {
        if (J.length) YD(X, Q, J);
        else qY(X);
      });
    }
    return G;
  }
  eG.coerceAndCheckDataType = QD;
  var sG = new Set(["string", "number", "integer", "boolean", "null"]);
  function $D(X, Q) {
    return Q
      ? X.filter(($) => sG.has($) || (Q === "array" && $ === "array"))
      : [];
  }
  function YD(X, Q, $) {
    let { gen: Y, data: W, opts: J } = X,
      G = Y.let("dataType", m._`typeof ${W}`),
      H = Y.let("coerced", m._`undefined`);
    if (J.coerceTypes === "array")
      Y.if(
        m._`${G} == 'object' && Array.isArray(${W}) && ${W}.length == 1`,
        () =>
          Y.assign(W, m._`${W}[0]`)
            .assign(G, m._`typeof ${W}`)
            .if(LY(Q, W, J.strictNumbers), () => Y.assign(H, W))
      );
    Y.if(m._`${H} !== undefined`);
    for (let z of $)
      if (sG.has(z) || (z === "array" && J.coerceTypes === "array")) B(z);
    Y.else(),
      qY(X),
      Y.endIf(),
      Y.if(m._`${H} !== undefined`, () => {
        Y.assign(W, H), WD(X, H);
      });
    function B(z) {
      switch (z) {
        case "string":
          Y.elseIf(m._`${G} == "number" || ${G} == "boolean"`)
            .assign(H, m._`"" + ${W}`)
            .elseIf(m._`${W} === null`)
            .assign(H, m._`""`);
          return;
        case "number":
          Y.elseIf(
            m._`${G} == "boolean" || ${W} === null
              || (${G} == "string" && ${W} && ${W} == +${W})`
          ).assign(H, m._`+${W}`);
          return;
        case "integer":
          Y.elseIf(
            m._`${G} === "boolean" || ${W} === null
              || (${G} === "string" && ${W} && ${W} == +${W} && !(${W} % 1))`
          ).assign(H, m._`+${W}`);
          return;
        case "boolean":
          Y.elseIf(m._`${W} === "false" || ${W} === 0 || ${W} === null`)
            .assign(H, !1)
            .elseIf(m._`${W} === "true" || ${W} === 1`)
            .assign(H, !0);
          return;
        case "null":
          Y.elseIf(m._`${W} === "" || ${W} === 0 || ${W} === false`),
            Y.assign(H, null);
          return;
        case "array":
          Y.elseIf(
            m._`${G} === "string" || ${G} === "number"
              || ${G} === "boolean" || ${W} === null`
          ).assign(H, m._`[${W}]`);
      }
    }
  }
  function WD({ gen: X, parentData: Q, parentDataProperty: $ }, Y) {
    X.if(m._`${Q} !== undefined`, () => X.assign(m._`${Q}[${$}]`, Y));
  }
  function VY(X, Q, $, Y = u6.Correct) {
    let W = Y === u6.Correct ? m.operators.EQ : m.operators.NEQ,
      J;
    switch (X) {
      case "null":
        return m._`${Q} ${W} null`;
      case "array":
        J = m._`Array.isArray(${Q})`;
        break;
      case "object":
        J = m._`${Q} && typeof ${Q} == "object" && !Array.isArray(${Q})`;
        break;
      case "integer":
        J = G(m._`!(${Q} % 1) && !isNaN(${Q})`);
        break;
      case "number":
        J = G();
        break;
      default:
        return m._`typeof ${Q} ${W} ${X}`;
    }
    return Y === u6.Correct ? J : (0, m.not)(J);
    function G(H = m.nil) {
      return (0, m.and)(
        m._`typeof ${Q} == "number"`,
        H,
        $ ? m._`isFinite(${Q})` : m.nil
      );
    }
  }
  eG.checkDataType = VY;
  function LY(X, Q, $, Y) {
    if (X.length === 1) return VY(X[0], Q, $, Y);
    let W,
      J = (0, tG.toHash)(X);
    if (J.array && J.object) {
      let G = m._`typeof ${Q} != "object"`;
      (W = J.null ? G : m._`!${Q} || ${G}`),
        delete J.null,
        delete J.array,
        delete J.object;
    } else W = m.nil;
    if (J.number) delete J.integer;
    for (let G in J) W = (0, m.and)(W, VY(G, Q, $, Y));
    return W;
  }
  eG.checkDataTypes = LY;
  var JD = {
    message: ({ schema: X }) => `must be ${X}`,
    params: ({ schema: X, schemaValue: Q }) =>
      typeof X == "string" ? m._`{type: ${X}}` : m._`{type: ${Q}}`,
  };
  function qY(X) {
    let Q = GD(X);
    (0, eO.reportError)(Q, JD);
  }
  eG.reportTypeError = qY;
  function GD(X) {
    let { gen: Q, data: $, schema: Y } = X,
      W = (0, tG.schemaRefOrVal)(X, Y, "type");
    return {
      gen: Q,
      keyword: "type",
      data: $,
      schema: Y.type,
      schemaCode: W,
      schemaValue: W,
      parentSchema: Y,
      params: {},
      it: X,
    };
  }
});
var W3 = P(($3) => {
  Object.defineProperty($3, "__esModule", { value: !0 });
  $3.assignDefaults = void 0;
  var l6 = p(),
    LD = e();
  function qD(X, Q) {
    let { properties: $, items: Y } = X.schema;
    if (Q === "object" && $) for (let W in $) Q3(X, W, $[W].default);
    else if (Q === "array" && Array.isArray(Y))
      Y.forEach((W, J) => Q3(X, J, W.default));
  }
  $3.assignDefaults = qD;
  function Q3(X, Q, $) {
    let { gen: Y, compositeRule: W, data: J, opts: G } = X;
    if ($ === void 0) return;
    let H = l6._`${J}${(0, l6.getProperty)(Q)}`;
    if (W) {
      (0, LD.checkStrictMode)(X, `default is ignored for: ${H}`);
      return;
    }
    let B = l6._`${H} === undefined`;
    if (G.useDefaults === "empty")
      B = l6._`${B} || ${H} === null || ${H} === ""`;
    Y.if(B, l6._`${H} = ${(0, l6.stringify)($)}`);
  }
});
var d0 = P((H3) => {
  Object.defineProperty(H3, "__esModule", { value: !0 });
  H3.validateUnion =
    H3.validateArray =
    H3.usePattern =
    H3.callValidateCode =
    H3.schemaProperties =
    H3.allSchemaProperties =
    H3.noPropertyInData =
    H3.propertyInData =
    H3.isOwnProperty =
    H3.hasPropFunc =
    H3.reportMissingProp =
    H3.checkMissingProp =
    H3.checkReportMissingProp =
      void 0;
  var G0 = p(),
    FY = e(),
    p1 = R1(),
    FD = e();
  function ND(X, Q) {
    let { gen: $, data: Y, it: W } = X;
    $.if(OY($, Y, Q, W.opts.ownProperties), () => {
      X.setParams({ missingProperty: G0._`${Q}` }, !0), X.error();
    });
  }
  H3.checkReportMissingProp = ND;
  function OD({ gen: X, data: Q, it: { opts: $ } }, Y, W) {
    return (0, G0.or)(
      ...Y.map((J) =>
        (0, G0.and)(OY(X, Q, J, $.ownProperties), G0._`${W} = ${J}`)
      )
    );
  }
  H3.checkMissingProp = OD;
  function DD(X, Q) {
    X.setParams({ missingProperty: Q }, !0), X.error();
  }
  H3.reportMissingProp = DD;
  function J3(X) {
    return X.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: G0._`Object.prototype.hasOwnProperty`,
    });
  }
  H3.hasPropFunc = J3;
  function NY(X, Q, $) {
    return G0._`${J3(X)}.call(${Q}, ${$})`;
  }
  H3.isOwnProperty = NY;
  function wD(X, Q, $, Y) {
    let W = G0._`${Q}${(0, G0.getProperty)($)} !== undefined`;
    return Y ? G0._`${W} && ${NY(X, Q, $)}` : W;
  }
  H3.propertyInData = wD;
  function OY(X, Q, $, Y) {
    let W = G0._`${Q}${(0, G0.getProperty)($)} === undefined`;
    return Y ? (0, G0.or)(W, (0, G0.not)(NY(X, Q, $))) : W;
  }
  H3.noPropertyInData = OY;
  function G3(X) {
    return X ? Object.keys(X).filter((Q) => Q !== "__proto__") : [];
  }
  H3.allSchemaProperties = G3;
  function AD(X, Q) {
    return G3(Q).filter(($) => !(0, FY.alwaysValidSchema)(X, Q[$]));
  }
  H3.schemaProperties = AD;
  function MD(
    {
      schemaCode: X,
      data: Q,
      it: { gen: $, topSchemaRef: Y, schemaPath: W, errorPath: J },
      it: G,
    },
    H,
    B,
    z
  ) {
    let K = z ? G0._`${X}, ${Q}, ${Y}${W}` : Q,
      V = [
        [
          p1.default.instancePath,
          (0, G0.strConcat)(p1.default.instancePath, J),
        ],
        [p1.default.parentData, G.parentData],
        [p1.default.parentDataProperty, G.parentDataProperty],
        [p1.default.rootData, p1.default.rootData],
      ];
    if (G.opts.dynamicRef)
      V.push([p1.default.dynamicAnchors, p1.default.dynamicAnchors]);
    let L = G0._`${K}, ${$.object(...V)}`;
    return B !== G0.nil ? G0._`${H}.call(${B}, ${L})` : G0._`${H}(${L})`;
  }
  H3.callValidateCode = MD;
  var jD = G0._`new RegExp`;
  function RD({ gen: X, it: { opts: Q } }, $) {
    let Y = Q.unicodeRegExp ? "u" : "",
      { regExp: W } = Q.code,
      J = W($, Y);
    return X.scopeValue("pattern", {
      key: J.toString(),
      ref: J,
      code: G0._`${
        W.code === "new RegExp" ? jD : (0, FD.useFunc)(X, W)
      }(${$}, ${Y})`,
    });
  }
  H3.usePattern = RD;
  function ID(X) {
    let { gen: Q, data: $, keyword: Y, it: W } = X,
      J = Q.name("valid");
    if (W.allErrors) {
      let H = Q.let("valid", !0);
      return G(() => Q.assign(H, !1)), H;
    }
    return Q.var(J, !0), G(() => Q.break()), J;
    function G(H) {
      let B = Q.const("len", G0._`${$}.length`);
      Q.forRange("i", 0, B, (z) => {
        X.subschema({ keyword: Y, dataProp: z, dataPropType: FY.Type.Num }, J),
          Q.if((0, G0.not)(J), H);
      });
    }
  }
  H3.validateArray = ID;
  function ED(X) {
    let { gen: Q, schema: $, keyword: Y, it: W } = X;
    if (!Array.isArray($)) throw Error("ajv implementation error");
    if ($.some((B) => (0, FY.alwaysValidSchema)(W, B)) && !W.opts.unevaluated)
      return;
    let G = Q.let("valid", !1),
      H = Q.name("_valid");
    Q.block(() =>
      $.forEach((B, z) => {
        let K = X.subschema(
          { keyword: Y, schemaProp: z, compositeRule: !0 },
          H
        );
        if ((Q.assign(G, G0._`${G} || ${H}`), !X.mergeValidEvaluated(K, H)))
          Q.if((0, G0.not)(G));
      })
    ),
      X.result(
        G,
        () => X.reset(),
        () => X.error(!0)
      );
  }
  H3.validateUnion = ED;
});
var L3 = P((U3) => {
  Object.defineProperty(U3, "__esModule", { value: !0 });
  U3.validateKeywordUsage =
    U3.validSchemaType =
    U3.funcKeywordCode =
    U3.macroKeywordCode =
      void 0;
  var T0 = p(),
    B6 = R1(),
    fD = d0(),
    hD = lX();
  function uD(X, Q) {
    let { gen: $, keyword: Y, schema: W, parentSchema: J, it: G } = X,
      H = Q.macro.call(G.self, W, J, G),
      B = K3($, Y, H);
    if (G.opts.validateSchema !== !1) G.self.validateSchema(H, !0);
    let z = $.name("valid");
    X.subschema(
      {
        schema: H,
        schemaPath: T0.nil,
        errSchemaPath: `${G.errSchemaPath}/${Y}`,
        topSchemaRef: B,
        compositeRule: !0,
      },
      z
    ),
      X.pass(z, () => X.error(!0));
  }
  U3.macroKeywordCode = uD;
  function lD(X, Q) {
    var $;
    let { gen: Y, keyword: W, schema: J, parentSchema: G, $data: H, it: B } = X;
    cD(B, Q);
    let z = !H && Q.compile ? Q.compile.call(B.self, J, G, B) : Q.validate,
      K = K3(Y, W, z),
      V = Y.let("valid");
    X.block$data(V, L), X.ok(($ = Q.valid) !== null && $ !== void 0 ? $ : V);
    function L() {
      if (Q.errors === !1) {
        if ((q(), Q.modifying)) z3(X);
        N(() => X.error());
      } else {
        let w = Q.async ? U() : F();
        if (Q.modifying) z3(X);
        N(() => mD(X, w));
      }
    }
    function U() {
      let w = Y.let("ruleErrs", null);
      return (
        Y.try(
          () => q(T0._`await `),
          (M) =>
            Y.assign(V, !1).if(
              T0._`${M} instanceof ${B.ValidationError}`,
              () => Y.assign(w, T0._`${M}.errors`),
              () => Y.throw(M)
            )
        ),
        w
      );
    }
    function F() {
      let w = T0._`${K}.errors`;
      return Y.assign(w, null), q(T0.nil), w;
    }
    function q(w = Q.async ? T0._`await ` : T0.nil) {
      let M = B.opts.passContext ? B6.default.this : B6.default.self,
        R = !(("compile" in Q && !H) || Q.schema === !1);
      Y.assign(
        V,
        T0._`${w}${(0, fD.callValidateCode)(X, K, M, R)}`,
        Q.modifying
      );
    }
    function N(w) {
      var M;
      Y.if((0, T0.not)((M = Q.valid) !== null && M !== void 0 ? M : V), w);
    }
  }
  U3.funcKeywordCode = lD;
  function z3(X) {
    let { gen: Q, data: $, it: Y } = X;
    Q.if(Y.parentData, () =>
      Q.assign($, T0._`${Y.parentData}[${Y.parentDataProperty}]`)
    );
  }
  function mD(X, Q) {
    let { gen: $ } = X;
    $.if(
      T0._`Array.isArray(${Q})`,
      () => {
        $.assign(
          B6.default.vErrors,
          T0._`${B6.default.vErrors} === null ? ${Q} : ${B6.default.vErrors}.concat(${Q})`
        ).assign(B6.default.errors, T0._`${B6.default.vErrors}.length`),
          (0, hD.extendErrors)(X);
      },
      () => X.error()
    );
  }
  function cD({ schemaEnv: X }, Q) {
    if (Q.async && !X.$async) throw Error("async keyword in sync schema");
  }
  function K3(X, Q, $) {
    if ($ === void 0) throw Error(`keyword "${Q}" failed to compile`);
    return X.scopeValue(
      "keyword",
      typeof $ == "function"
        ? { ref: $ }
        : { ref: $, code: (0, T0.stringify)($) }
    );
  }
  function pD(X, Q, $ = !1) {
    return (
      !Q.length ||
      Q.some((Y) =>
        Y === "array"
          ? Array.isArray(X)
          : Y === "object"
          ? X && typeof X == "object" && !Array.isArray(X)
          : typeof X == Y || ($ && typeof X > "u")
      )
    );
  }
  U3.validSchemaType = pD;
  function dD({ schema: X, opts: Q, self: $, errSchemaPath: Y }, W, J) {
    if (Array.isArray(W.keyword) ? !W.keyword.includes(J) : W.keyword !== J)
      throw Error("ajv implementation error");
    let G = W.dependencies;
    if (
      G === null || G === void 0
        ? void 0
        : G.some((H) => !Object.prototype.hasOwnProperty.call(X, H))
    )
      throw Error(
        `parent schema must have dependencies of ${J}: ${G.join(",")}`
      );
    if (W.validateSchema) {
      if (!W.validateSchema(X[J])) {
        let B =
          `keyword "${J}" value is invalid at path "${Y}": ` +
          $.errorsText(W.validateSchema.errors);
        if (Q.validateSchema === "log") $.logger.error(B);
        else throw Error(B);
      }
    }
  }
  U3.validateKeywordUsage = dD;
});
var O3 = P((F3) => {
  Object.defineProperty(F3, "__esModule", { value: !0 });
  F3.extendSubschemaMode = F3.extendSubschemaData = F3.getSubschema = void 0;
  var K1 = p(),
    q3 = e();
  function oD(
    X,
    {
      keyword: Q,
      schemaProp: $,
      schema: Y,
      schemaPath: W,
      errSchemaPath: J,
      topSchemaRef: G,
    }
  ) {
    if (Q !== void 0 && Y !== void 0)
      throw Error('both "keyword" and "schema" passed, only one allowed');
    if (Q !== void 0) {
      let H = X.schema[Q];
      return $ === void 0
        ? {
            schema: H,
            schemaPath: K1._`${X.schemaPath}${(0, K1.getProperty)(Q)}`,
            errSchemaPath: `${X.errSchemaPath}/${Q}`,
          }
        : {
            schema: H[$],
            schemaPath: K1._`${X.schemaPath}${(0, K1.getProperty)(Q)}${(0,
            K1.getProperty)($)}`,
            errSchemaPath: `${X.errSchemaPath}/${Q}/${(0, q3.escapeFragment)(
              $
            )}`,
          };
    }
    if (Y !== void 0) {
      if (W === void 0 || J === void 0 || G === void 0)
        throw Error(
          '"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"'
        );
      return { schema: Y, schemaPath: W, topSchemaRef: G, errSchemaPath: J };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  F3.getSubschema = oD;
  function tD(
    X,
    Q,
    { dataProp: $, dataPropType: Y, data: W, dataTypes: J, propertyName: G }
  ) {
    if (W !== void 0 && $ !== void 0)
      throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen: H } = Q;
    if ($ !== void 0) {
      let { errorPath: z, dataPathArr: K, opts: V } = Q,
        L = H.let("data", K1._`${Q.data}${(0, K1.getProperty)($)}`, !0);
      B(L),
        (X.errorPath = K1.str`${z}${(0, q3.getErrorPath)(
          $,
          Y,
          V.jsPropertySyntax
        )}`),
        (X.parentDataProperty = K1._`${$}`),
        (X.dataPathArr = [...K, X.parentDataProperty]);
    }
    if (W !== void 0) {
      let z = W instanceof K1.Name ? W : H.let("data", W, !0);
      if ((B(z), G !== void 0)) X.propertyName = G;
    }
    if (J) X.dataTypes = J;
    function B(z) {
      (X.data = z),
        (X.dataLevel = Q.dataLevel + 1),
        (X.dataTypes = []),
        (Q.definedProperties = new Set()),
        (X.parentData = Q.data),
        (X.dataNames = [...Q.dataNames, z]);
    }
  }
  F3.extendSubschemaData = tD;
  function aD(
    X,
    {
      jtdDiscriminator: Q,
      jtdMetadata: $,
      compositeRule: Y,
      createErrors: W,
      allErrors: J,
    }
  ) {
    if (Y !== void 0) X.compositeRule = Y;
    if (W !== void 0) X.createErrors = W;
    if (J !== void 0) X.allErrors = J;
    (X.jtdDiscriminator = Q), (X.jtdMetadata = $);
  }
  F3.extendSubschemaMode = aD;
});
var DY = P(($T, D3) => {
  D3.exports = function X(Q, $) {
    if (Q === $) return !0;
    if (Q && $ && typeof Q == "object" && typeof $ == "object") {
      if (Q.constructor !== $.constructor) return !1;
      var Y, W, J;
      if (Array.isArray(Q)) {
        if (((Y = Q.length), Y != $.length)) return !1;
        for (W = Y; W-- !== 0; ) if (!X(Q[W], $[W])) return !1;
        return !0;
      }
      if (Q.constructor === RegExp)
        return Q.source === $.source && Q.flags === $.flags;
      if (Q.valueOf !== Object.prototype.valueOf)
        return Q.valueOf() === $.valueOf();
      if (Q.toString !== Object.prototype.toString)
        return Q.toString() === $.toString();
      if (((J = Object.keys(Q)), (Y = J.length), Y !== Object.keys($).length))
        return !1;
      for (W = Y; W-- !== 0; )
        if (!Object.prototype.hasOwnProperty.call($, J[W])) return !1;
      for (W = Y; W-- !== 0; ) {
        var G = J[W];
        if (!X(Q[G], $[G])) return !1;
      }
      return !0;
    }
    return Q !== Q && $ !== $;
  };
});
var A3 = P((YT, w3) => {
  var d1 = (w3.exports = function (X, Q, $) {
    if (typeof Q == "function") ($ = Q), (Q = {});
    $ = Q.cb || $;
    var Y = typeof $ == "function" ? $ : $.pre || function () {},
      W = $.post || function () {};
    C8(Q, Y, W, X, "", X);
  });
  d1.keywords = {
    additionalItems: !0,
    items: !0,
    contains: !0,
    additionalProperties: !0,
    propertyNames: !0,
    not: !0,
    if: !0,
    then: !0,
    else: !0,
  };
  d1.arrayKeywords = { items: !0, allOf: !0, anyOf: !0, oneOf: !0 };
  d1.propsKeywords = {
    $defs: !0,
    definitions: !0,
    properties: !0,
    patternProperties: !0,
    dependencies: !0,
  };
  d1.skipKeywords = {
    default: !0,
    enum: !0,
    const: !0,
    required: !0,
    maximum: !0,
    minimum: !0,
    exclusiveMaximum: !0,
    exclusiveMinimum: !0,
    multipleOf: !0,
    maxLength: !0,
    minLength: !0,
    pattern: !0,
    format: !0,
    maxItems: !0,
    minItems: !0,
    uniqueItems: !0,
    maxProperties: !0,
    minProperties: !0,
  };
  function C8(X, Q, $, Y, W, J, G, H, B, z) {
    if (Y && typeof Y == "object" && !Array.isArray(Y)) {
      Q(Y, W, J, G, H, B, z);
      for (var K in Y) {
        var V = Y[K];
        if (Array.isArray(V)) {
          if (K in d1.arrayKeywords)
            for (var L = 0; L < V.length; L++)
              C8(X, Q, $, V[L], W + "/" + K + "/" + L, J, W, K, Y, L);
        } else if (K in d1.propsKeywords) {
          if (V && typeof V == "object")
            for (var U in V)
              C8(X, Q, $, V[U], W + "/" + K + "/" + Xw(U), J, W, K, Y, U);
        } else if (K in d1.keywords || (X.allKeys && !(K in d1.skipKeywords)))
          C8(X, Q, $, V, W + "/" + K, J, W, K, Y);
      }
      $(Y, W, J, G, H, B, z);
    }
  }
  function Xw(X) {
    return X.replace(/~/g, "~0").replace(/\//g, "~1");
  }
});
var cX = P((I3) => {
  Object.defineProperty(I3, "__esModule", { value: !0 });
  I3.getSchemaRefs =
    I3.resolveUrl =
    I3.normalizeId =
    I3._getFullPath =
    I3.getFullPath =
    I3.inlineRef =
      void 0;
  var Qw = e(),
    $w = DY(),
    Yw = A3(),
    Ww = new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const",
    ]);
  function Jw(X, Q = !0) {
    if (typeof X == "boolean") return !0;
    if (Q === !0) return !wY(X);
    if (!Q) return !1;
    return M3(X) <= Q;
  }
  I3.inlineRef = Jw;
  var Gw = new Set([
    "$ref",
    "$recursiveRef",
    "$recursiveAnchor",
    "$dynamicRef",
    "$dynamicAnchor",
  ]);
  function wY(X) {
    for (let Q in X) {
      if (Gw.has(Q)) return !0;
      let $ = X[Q];
      if (Array.isArray($) && $.some(wY)) return !0;
      if (typeof $ == "object" && wY($)) return !0;
    }
    return !1;
  }
  function M3(X) {
    let Q = 0;
    for (let $ in X) {
      if ($ === "$ref") return 1 / 0;
      if ((Q++, Ww.has($))) continue;
      if (typeof X[$] == "object") (0, Qw.eachItem)(X[$], (Y) => (Q += M3(Y)));
      if (Q === 1 / 0) return 1 / 0;
    }
    return Q;
  }
  function j3(X, Q = "", $) {
    if ($ !== !1) Q = m6(Q);
    let Y = X.parse(Q);
    return R3(X, Y);
  }
  I3.getFullPath = j3;
  function R3(X, Q) {
    return X.serialize(Q).split("#")[0] + "#";
  }
  I3._getFullPath = R3;
  var Hw = /#\/?$/;
  function m6(X) {
    return X ? X.replace(Hw, "") : "";
  }
  I3.normalizeId = m6;
  function Bw(X, Q, $) {
    return ($ = m6($)), X.resolve(Q, $);
  }
  I3.resolveUrl = Bw;
  var zw = /^[a-z_][-a-z0-9._]*$/i;
  function Kw(X, Q) {
    if (typeof X == "boolean") return {};
    let { schemaId: $, uriResolver: Y } = this.opts,
      W = m6(X[$] || Q),
      J = { "": W },
      G = j3(Y, W, !1),
      H = {},
      B = new Set();
    return (
      Yw(X, { allKeys: !0 }, (V, L, U, F) => {
        if (F === void 0) return;
        let q = G + L,
          N = J[F];
        if (typeof V[$] == "string") N = w.call(this, V[$]);
        M.call(this, V.$anchor), M.call(this, V.$dynamicAnchor), (J[L] = N);
        function w(R) {
          let S = this.opts.uriResolver.resolve;
          if (((R = m6(N ? S(N, R) : R)), B.has(R))) throw K(R);
          B.add(R);
          let C = this.refs[R];
          if (typeof C == "string") C = this.refs[C];
          if (typeof C == "object") z(V, C.schema, R);
          else if (R !== m6(q))
            if (R[0] === "#") z(V, H[R], R), (H[R] = V);
            else this.refs[R] = q;
          return R;
        }
        function M(R) {
          if (typeof R == "string") {
            if (!zw.test(R)) throw Error(`invalid anchor "${R}"`);
            w.call(this, `#${R}`);
          }
        }
      }),
      H
    );
    function z(V, L, U) {
      if (L !== void 0 && !$w(V, L)) throw K(U);
    }
    function K(V) {
      return Error(`reference "${V}" resolves to more than one schema`);
    }
  }
  I3.getSchemaRefs = Kw;
});
var iX = P((u3) => {
  Object.defineProperty(u3, "__esModule", { value: !0 });
  u3.getData = u3.KeywordCxt = u3.validateFunctionCode = void 0;
  var C3 = cG(),
    b3 = mX(),
    MY = UY(),
    k8 = mX(),
    Nw = W3(),
    dX = L3(),
    AY = O3(),
    _ = p(),
    u = R1(),
    Ow = cX(),
    I1 = e(),
    pX = lX();
  function Dw(X) {
    if (T3(X)) {
      if ((_3(X), v3(X))) {
        Mw(X);
        return;
      }
    }
    k3(X, () => (0, C3.topBoolOrEmptySchema)(X));
  }
  u3.validateFunctionCode = Dw;
  function k3(
    { gen: X, validateName: Q, schema: $, schemaEnv: Y, opts: W },
    J
  ) {
    if (W.code.es5)
      X.func(Q, _._`${u.default.data}, ${u.default.valCxt}`, Y.$async, () => {
        X.code(_._`"use strict"; ${P3($, W)}`), Aw(X, W), X.code(J);
      });
    else
      X.func(Q, _._`${u.default.data}, ${ww(W)}`, Y.$async, () =>
        X.code(P3($, W)).code(J)
      );
  }
  function ww(X) {
    return _._`{${u.default.instancePath}="", ${u.default.parentData}, ${
      u.default.parentDataProperty
    }, ${u.default.rootData}=${u.default.data}${
      X.dynamicRef ? _._`, ${u.default.dynamicAnchors}={}` : _.nil
    }}={}`;
  }
  function Aw(X, Q) {
    X.if(
      u.default.valCxt,
      () => {
        if (
          (X.var(
            u.default.instancePath,
            _._`${u.default.valCxt}.${u.default.instancePath}`
          ),
          X.var(
            u.default.parentData,
            _._`${u.default.valCxt}.${u.default.parentData}`
          ),
          X.var(
            u.default.parentDataProperty,
            _._`${u.default.valCxt}.${u.default.parentDataProperty}`
          ),
          X.var(
            u.default.rootData,
            _._`${u.default.valCxt}.${u.default.rootData}`
          ),
          Q.dynamicRef)
        )
          X.var(
            u.default.dynamicAnchors,
            _._`${u.default.valCxt}.${u.default.dynamicAnchors}`
          );
      },
      () => {
        if (
          (X.var(u.default.instancePath, _._`""`),
          X.var(u.default.parentData, _._`undefined`),
          X.var(u.default.parentDataProperty, _._`undefined`),
          X.var(u.default.rootData, u.default.data),
          Q.dynamicRef)
        )
          X.var(u.default.dynamicAnchors, _._`{}`);
      }
    );
  }
  function Mw(X) {
    let { schema: Q, opts: $, gen: Y } = X;
    k3(X, () => {
      if ($.$comment && Q.$comment) y3(X);
      if (
        (bw(X),
        Y.let(u.default.vErrors, null),
        Y.let(u.default.errors, 0),
        $.unevaluated)
      )
        jw(X);
      x3(X), Zw(X);
    });
    return;
  }
  function jw(X) {
    let { gen: Q, validateName: $ } = X;
    (X.evaluated = Q.const("evaluated", _._`${$}.evaluated`)),
      Q.if(_._`${X.evaluated}.dynamicProps`, () =>
        Q.assign(_._`${X.evaluated}.props`, _._`undefined`)
      ),
      Q.if(_._`${X.evaluated}.dynamicItems`, () =>
        Q.assign(_._`${X.evaluated}.items`, _._`undefined`)
      );
  }
  function P3(X, Q) {
    let $ = typeof X == "object" && X[Q.schemaId];
    return $ && (Q.code.source || Q.code.process)
      ? _._`/*# sourceURL=${$} */`
      : _.nil;
  }
  function Rw(X, Q) {
    if (T3(X)) {
      if ((_3(X), v3(X))) {
        Iw(X, Q);
        return;
      }
    }
    (0, C3.boolOrEmptySchema)(X, Q);
  }
  function v3({ schema: X, self: Q }) {
    if (typeof X == "boolean") return !X;
    for (let $ in X) if (Q.RULES.all[$]) return !0;
    return !1;
  }
  function T3(X) {
    return typeof X.schema != "boolean";
  }
  function Iw(X, Q) {
    let { schema: $, gen: Y, opts: W } = X;
    if (W.$comment && $.$comment) y3(X);
    Pw(X), Sw(X);
    let J = Y.const("_errs", u.default.errors);
    x3(X, J), Y.var(Q, _._`${J} === ${u.default.errors}`);
  }
  function _3(X) {
    (0, I1.checkUnknownRules)(X), Ew(X);
  }
  function x3(X, Q) {
    if (X.opts.jtd) return S3(X, [], !1, Q);
    let $ = (0, b3.getSchemaTypes)(X.schema),
      Y = (0, b3.coerceAndCheckDataType)(X, $);
    S3(X, $, !Y, Q);
  }
  function Ew(X) {
    let { schema: Q, errSchemaPath: $, opts: Y, self: W } = X;
    if (
      Q.$ref &&
      Y.ignoreKeywordsWithRef &&
      (0, I1.schemaHasRulesButRef)(Q, W.RULES)
    )
      W.logger.warn(`$ref: keywords ignored in schema at path "${$}"`);
  }
  function bw(X) {
    let { schema: Q, opts: $ } = X;
    if (Q.default !== void 0 && $.useDefaults && $.strictSchema)
      (0, I1.checkStrictMode)(X, "default is ignored in the schema root");
  }
  function Pw(X) {
    let Q = X.schema[X.opts.schemaId];
    if (Q) X.baseId = (0, Ow.resolveUrl)(X.opts.uriResolver, X.baseId, Q);
  }
  function Sw(X) {
    if (X.schema.$async && !X.schemaEnv.$async)
      throw Error("async schema in sync schema");
  }
  function y3({ gen: X, schemaEnv: Q, schema: $, errSchemaPath: Y, opts: W }) {
    let J = $.$comment;
    if (W.$comment === !0) X.code(_._`${u.default.self}.logger.log(${J})`);
    else if (typeof W.$comment == "function") {
      let G = _.str`${Y}/$comment`,
        H = X.scopeValue("root", { ref: Q.root });
      X.code(_._`${u.default.self}.opts.$comment(${J}, ${G}, ${H}.schema)`);
    }
  }
  function Zw(X) {
    let {
      gen: Q,
      schemaEnv: $,
      validateName: Y,
      ValidationError: W,
      opts: J,
    } = X;
    if ($.$async)
      Q.if(
        _._`${u.default.errors} === 0`,
        () => Q.return(u.default.data),
        () => Q.throw(_._`new ${W}(${u.default.vErrors})`)
      );
    else {
      if ((Q.assign(_._`${Y}.errors`, u.default.vErrors), J.unevaluated)) Cw(X);
      Q.return(_._`${u.default.errors} === 0`);
    }
  }
  function Cw({ gen: X, evaluated: Q, props: $, items: Y }) {
    if ($ instanceof _.Name) X.assign(_._`${Q}.props`, $);
    if (Y instanceof _.Name) X.assign(_._`${Q}.items`, Y);
  }
  function S3(X, Q, $, Y) {
    let { gen: W, schema: J, data: G, allErrors: H, opts: B, self: z } = X,
      { RULES: K } = z;
    if (
      J.$ref &&
      (B.ignoreKeywordsWithRef || !(0, I1.schemaHasRulesButRef)(J, K))
    ) {
      W.block(() => f3(X, "$ref", K.all.$ref.definition));
      return;
    }
    if (!B.jtd) kw(X, Q);
    W.block(() => {
      for (let L of K.rules) V(L);
      V(K.post);
    });
    function V(L) {
      if (!(0, MY.shouldUseGroup)(J, L)) return;
      if (L.type) {
        if (
          (W.if((0, k8.checkDataType)(L.type, G, B.strictNumbers)),
          Z3(X, L),
          Q.length === 1 && Q[0] === L.type && $)
        )
          W.else(), (0, k8.reportTypeError)(X);
        W.endIf();
      } else Z3(X, L);
      if (!H) W.if(_._`${u.default.errors} === ${Y || 0}`);
    }
  }
  function Z3(X, Q) {
    let {
      gen: $,
      schema: Y,
      opts: { useDefaults: W },
    } = X;
    if (W) (0, Nw.assignDefaults)(X, Q.type);
    $.block(() => {
      for (let J of Q.rules)
        if ((0, MY.shouldUseRule)(Y, J)) f3(X, J.keyword, J.definition, Q.type);
    });
  }
  function kw(X, Q) {
    if (X.schemaEnv.meta || !X.opts.strictTypes) return;
    if ((vw(X, Q), !X.opts.allowUnionTypes)) Tw(X, Q);
    _w(X, X.dataTypes);
  }
  function vw(X, Q) {
    if (!Q.length) return;
    if (!X.dataTypes.length) {
      X.dataTypes = Q;
      return;
    }
    Q.forEach(($) => {
      if (!g3(X.dataTypes, $))
        jY(X, `type "${$}" not allowed by context "${X.dataTypes.join(",")}"`);
    }),
      yw(X, Q);
  }
  function Tw(X, Q) {
    if (Q.length > 1 && !(Q.length === 2 && Q.includes("null")))
      jY(X, "use allowUnionTypes to allow union type keyword");
  }
  function _w(X, Q) {
    let $ = X.self.RULES.all;
    for (let Y in $) {
      let W = $[Y];
      if (typeof W == "object" && (0, MY.shouldUseRule)(X.schema, W)) {
        let { type: J } = W.definition;
        if (J.length && !J.some((G) => xw(Q, G)))
          jY(X, `missing type "${J.join(",")}" for keyword "${Y}"`);
      }
    }
  }
  function xw(X, Q) {
    return X.includes(Q) || (Q === "number" && X.includes("integer"));
  }
  function g3(X, Q) {
    return X.includes(Q) || (Q === "integer" && X.includes("number"));
  }
  function yw(X, Q) {
    let $ = [];
    for (let Y of X.dataTypes)
      if (g3(Q, Y)) $.push(Y);
      else if (Q.includes("integer") && Y === "number") $.push("integer");
    X.dataTypes = $;
  }
  function jY(X, Q) {
    let $ = X.schemaEnv.baseId + X.errSchemaPath;
    (Q += ` at "${$}" (strictTypes)`),
      (0, I1.checkStrictMode)(X, Q, X.opts.strictTypes);
  }
  class RY {
    constructor(X, Q, $) {
      if (
        ((0, dX.validateKeywordUsage)(X, Q, $),
        (this.gen = X.gen),
        (this.allErrors = X.allErrors),
        (this.keyword = $),
        (this.data = X.data),
        (this.schema = X.schema[$]),
        (this.$data =
          Q.$data && X.opts.$data && this.schema && this.schema.$data),
        (this.schemaValue = (0, I1.schemaRefOrVal)(
          X,
          this.schema,
          $,
          this.$data
        )),
        (this.schemaType = Q.schemaType),
        (this.parentSchema = X.schema),
        (this.params = {}),
        (this.it = X),
        (this.def = Q),
        this.$data)
      )
        this.schemaCode = X.gen.const("vSchema", h3(this.$data, X));
      else if (
        ((this.schemaCode = this.schemaValue),
        !(0, dX.validSchemaType)(this.schema, Q.schemaType, Q.allowUndefined))
      )
        throw Error(`${$} value must be ${JSON.stringify(Q.schemaType)}`);
      if ("code" in Q ? Q.trackErrors : Q.errors !== !1)
        this.errsCount = X.gen.const("_errs", u.default.errors);
    }
    result(X, Q, $) {
      this.failResult((0, _.not)(X), Q, $);
    }
    failResult(X, Q, $) {
      if ((this.gen.if(X), $)) $();
      else this.error();
      if (Q) {
        if ((this.gen.else(), Q(), this.allErrors)) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass(X, Q) {
      this.failResult((0, _.not)(X), void 0, Q);
    }
    fail(X) {
      if (X === void 0) {
        if ((this.error(), !this.allErrors)) this.gen.if(!1);
        return;
      }
      if ((this.gen.if(X), this.error(), this.allErrors)) this.gen.endIf();
      else this.gen.else();
    }
    fail$data(X) {
      if (!this.$data) return this.fail(X);
      let { schemaCode: Q } = this;
      this.fail(
        _._`${Q} !== undefined && (${(0, _.or)(this.invalid$data(), X)})`
      );
    }
    error(X, Q, $) {
      if (Q) {
        this.setParams(Q), this._error(X, $), this.setParams({});
        return;
      }
      this._error(X, $);
    }
    _error(X, Q) {
      (X ? pX.reportExtraError : pX.reportError)(this, this.def.error, Q);
    }
    $dataError() {
      (0, pX.reportError)(this, this.def.$dataError || pX.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0)
        throw Error('add "trackErrors" to keyword definition');
      (0, pX.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(X) {
      if (!this.allErrors) this.gen.if(X);
    }
    setParams(X, Q) {
      if (Q) Object.assign(this.params, X);
      else this.params = X;
    }
    block$data(X, Q, $ = _.nil) {
      this.gen.block(() => {
        this.check$data(X, $), Q();
      });
    }
    check$data(X = _.nil, Q = _.nil) {
      if (!this.$data) return;
      let { gen: $, schemaCode: Y, schemaType: W, def: J } = this;
      if (($.if((0, _.or)(_._`${Y} === undefined`, Q)), X !== _.nil))
        $.assign(X, !0);
      if (W.length || J.validateSchema) {
        if (($.elseIf(this.invalid$data()), this.$dataError(), X !== _.nil))
          $.assign(X, !1);
      }
      $.else();
    }
    invalid$data() {
      let { gen: X, schemaCode: Q, schemaType: $, def: Y, it: W } = this;
      return (0, _.or)(J(), G());
      function J() {
        if ($.length) {
          if (!(Q instanceof _.Name)) throw Error("ajv implementation error");
          let H = Array.isArray($) ? $ : [$];
          return _._`${(0, k8.checkDataTypes)(
            H,
            Q,
            W.opts.strictNumbers,
            k8.DataType.Wrong
          )}`;
        }
        return _.nil;
      }
      function G() {
        if (Y.validateSchema) {
          let H = X.scopeValue("validate$data", { ref: Y.validateSchema });
          return _._`!${H}(${Q})`;
        }
        return _.nil;
      }
    }
    subschema(X, Q) {
      let $ = (0, AY.getSubschema)(this.it, X);
      (0, AY.extendSubschemaData)($, this.it, X),
        (0, AY.extendSubschemaMode)($, X);
      let Y = { ...this.it, ...$, items: void 0, props: void 0 };
      return Rw(Y, Q), Y;
    }
    mergeEvaluated(X, Q) {
      let { it: $, gen: Y } = this;
      if (!$.opts.unevaluated) return;
      if ($.props !== !0 && X.props !== void 0)
        $.props = I1.mergeEvaluated.props(Y, X.props, $.props, Q);
      if ($.items !== !0 && X.items !== void 0)
        $.items = I1.mergeEvaluated.items(Y, X.items, $.items, Q);
    }
    mergeValidEvaluated(X, Q) {
      let { it: $, gen: Y } = this;
      if ($.opts.unevaluated && ($.props !== !0 || $.items !== !0))
        return Y.if(Q, () => this.mergeEvaluated(X, _.Name)), !0;
    }
  }
  u3.KeywordCxt = RY;
  function f3(X, Q, $, Y) {
    let W = new RY(X, $, Q);
    if ("code" in $) $.code(W, Y);
    else if (W.$data && $.validate) (0, dX.funcKeywordCode)(W, $);
    else if ("macro" in $) (0, dX.macroKeywordCode)(W, $);
    else if ($.compile || $.validate) (0, dX.funcKeywordCode)(W, $);
  }
  var gw = /^\/(?:[^~]|~0|~1)*$/,
    fw = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function h3(X, { dataLevel: Q, dataNames: $, dataPathArr: Y }) {
    let W, J;
    if (X === "") return u.default.rootData;
    if (X[0] === "/") {
      if (!gw.test(X)) throw Error(`Invalid JSON-pointer: ${X}`);
      (W = X), (J = u.default.rootData);
    } else {
      let z = fw.exec(X);
      if (!z) throw Error(`Invalid JSON-pointer: ${X}`);
      let K = +z[1];
      if (((W = z[2]), W === "#")) {
        if (K >= Q) throw Error(B("property/index", K));
        return Y[Q - K];
      }
      if (K > Q) throw Error(B("data", K));
      if (((J = $[Q - K]), !W)) return J;
    }
    let G = J,
      H = W.split("/");
    for (let z of H)
      if (z)
        (J = _._`${J}${(0, _.getProperty)((0, I1.unescapeJsonPointer)(z))}`),
          (G = _._`${G} && ${J}`);
    return G;
    function B(z, K) {
      return `Cannot access ${z} ${K} levels up, current level is ${Q}`;
    }
  }
  u3.getData = h3;
});
var v8 = P((c3) => {
  Object.defineProperty(c3, "__esModule", { value: !0 });
  class m3 extends Error {
    constructor(X) {
      super("validation failed");
      (this.errors = X), (this.ajv = this.validation = !0);
    }
  }
  c3.default = m3;
});
var nX = P((d3) => {
  Object.defineProperty(d3, "__esModule", { value: !0 });
  var IY = cX();
  class p3 extends Error {
    constructor(X, Q, $, Y) {
      super(Y || `can't resolve reference ${$} from id ${Q}`);
      (this.missingRef = (0, IY.resolveUrl)(X, Q, $)),
        (this.missingSchema = (0, IY.normalizeId)(
          (0, IY.getFullPath)(X, this.missingRef)
        ));
    }
  }
  d3.default = p3;
});
var _8 = P((r3) => {
  Object.defineProperty(r3, "__esModule", { value: !0 });
  r3.resolveSchema =
    r3.getCompilingSchema =
    r3.resolveRef =
    r3.compileSchema =
    r3.SchemaEnv =
      void 0;
  var X1 = p(),
    cw = v8(),
    z6 = R1(),
    Q1 = cX(),
    i3 = e(),
    pw = iX();
  class rX {
    constructor(X) {
      var Q;
      (this.refs = {}), (this.dynamicAnchors = {});
      let $;
      if (typeof X.schema == "object") $ = X.schema;
      (this.schema = X.schema),
        (this.schemaId = X.schemaId),
        (this.root = X.root || this),
        (this.baseId =
          (Q = X.baseId) !== null && Q !== void 0
            ? Q
            : (0, Q1.normalizeId)(
                $ === null || $ === void 0 ? void 0 : $[X.schemaId || "$id"]
              )),
        (this.schemaPath = X.schemaPath),
        (this.localRefs = X.localRefs),
        (this.meta = X.meta),
        (this.$async = $ === null || $ === void 0 ? void 0 : $.$async),
        (this.refs = {});
    }
  }
  r3.SchemaEnv = rX;
  function bY(X) {
    let Q = n3.call(this, X);
    if (Q) return Q;
    let $ = (0, Q1.getFullPath)(this.opts.uriResolver, X.root.baseId),
      { es5: Y, lines: W } = this.opts.code,
      { ownProperties: J } = this.opts,
      G = new X1.CodeGen(this.scope, { es5: Y, lines: W, ownProperties: J }),
      H;
    if (X.$async)
      H = G.scopeValue("Error", {
        ref: cw.default,
        code: X1._`require("ajv/dist/runtime/validation_error").default`,
      });
    let B = G.scopeName("validate");
    X.validateName = B;
    let z = {
        gen: G,
        allErrors: this.opts.allErrors,
        data: z6.default.data,
        parentData: z6.default.parentData,
        parentDataProperty: z6.default.parentDataProperty,
        dataNames: [z6.default.data],
        dataPathArr: [X1.nil],
        dataLevel: 0,
        dataTypes: [],
        definedProperties: new Set(),
        topSchemaRef: G.scopeValue(
          "schema",
          this.opts.code.source === !0
            ? { ref: X.schema, code: (0, X1.stringify)(X.schema) }
            : { ref: X.schema }
        ),
        validateName: B,
        ValidationError: H,
        schema: X.schema,
        schemaEnv: X,
        rootId: $,
        baseId: X.baseId || $,
        schemaPath: X1.nil,
        errSchemaPath: X.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: X1._`""`,
        opts: this.opts,
        self: this,
      },
      K;
    try {
      this._compilations.add(X),
        (0, pw.validateFunctionCode)(z),
        G.optimize(this.opts.code.optimize);
      let V = G.toString();
      if (
        ((K = `${G.scopeRefs(z6.default.scope)}return ${V}`),
        this.opts.code.process)
      )
        K = this.opts.code.process(K, X);
      let U = Function(
        `${z6.default.self}`,
        `${z6.default.scope}`,
        K
      )(this, this.scope.get());
      if (
        (this.scope.value(B, { ref: U }),
        (U.errors = null),
        (U.schema = X.schema),
        (U.schemaEnv = X),
        X.$async)
      )
        U.$async = !0;
      if (this.opts.code.source === !0)
        U.source = { validateName: B, validateCode: V, scopeValues: G._values };
      if (this.opts.unevaluated) {
        let { props: F, items: q } = z;
        if (
          ((U.evaluated = {
            props: F instanceof X1.Name ? void 0 : F,
            items: q instanceof X1.Name ? void 0 : q,
            dynamicProps: F instanceof X1.Name,
            dynamicItems: q instanceof X1.Name,
          }),
          U.source)
        )
          U.source.evaluated = (0, X1.stringify)(U.evaluated);
      }
      return (X.validate = U), X;
    } catch (V) {
      if ((delete X.validate, delete X.validateName, K))
        this.logger.error("Error compiling schema, function code:", K);
      throw V;
    } finally {
      this._compilations.delete(X);
    }
  }
  r3.compileSchema = bY;
  function dw(X, Q, $) {
    var Y;
    $ = (0, Q1.resolveUrl)(this.opts.uriResolver, Q, $);
    let W = X.refs[$];
    if (W) return W;
    let J = rw.call(this, X, $);
    if (J === void 0) {
      let G = (Y = X.localRefs) === null || Y === void 0 ? void 0 : Y[$],
        { schemaId: H } = this.opts;
      if (G) J = new rX({ schema: G, schemaId: H, root: X, baseId: Q });
    }
    if (J === void 0) return;
    return (X.refs[$] = iw.call(this, J));
  }
  r3.resolveRef = dw;
  function iw(X) {
    if ((0, Q1.inlineRef)(X.schema, this.opts.inlineRefs)) return X.schema;
    return X.validate ? X : bY.call(this, X);
  }
  function n3(X) {
    for (let Q of this._compilations) if (nw(Q, X)) return Q;
  }
  r3.getCompilingSchema = n3;
  function nw(X, Q) {
    return X.schema === Q.schema && X.root === Q.root && X.baseId === Q.baseId;
  }
  function rw(X, Q) {
    let $;
    while (typeof ($ = this.refs[Q]) == "string") Q = $;
    return $ || this.schemas[Q] || T8.call(this, X, Q);
  }
  function T8(X, Q) {
    let $ = this.opts.uriResolver.parse(Q),
      Y = (0, Q1._getFullPath)(this.opts.uriResolver, $),
      W = (0, Q1.getFullPath)(this.opts.uriResolver, X.baseId, void 0);
    if (Object.keys(X.schema).length > 0 && Y === W) return EY.call(this, $, X);
    let J = (0, Q1.normalizeId)(Y),
      G = this.refs[J] || this.schemas[J];
    if (typeof G == "string") {
      let H = T8.call(this, X, G);
      if (typeof (H === null || H === void 0 ? void 0 : H.schema) !== "object")
        return;
      return EY.call(this, $, H);
    }
    if (typeof (G === null || G === void 0 ? void 0 : G.schema) !== "object")
      return;
    if (!G.validate) bY.call(this, G);
    if (J === (0, Q1.normalizeId)(Q)) {
      let { schema: H } = G,
        { schemaId: B } = this.opts,
        z = H[B];
      if (z) W = (0, Q1.resolveUrl)(this.opts.uriResolver, W, z);
      return new rX({ schema: H, schemaId: B, root: X, baseId: W });
    }
    return EY.call(this, $, G);
  }
  r3.resolveSchema = T8;
  var ow = new Set([
    "properties",
    "patternProperties",
    "enum",
    "dependencies",
    "definitions",
  ]);
  function EY(X, { baseId: Q, schema: $, root: Y }) {
    var W;
    if (((W = X.fragment) === null || W === void 0 ? void 0 : W[0]) !== "/")
      return;
    for (let H of X.fragment.slice(1).split("/")) {
      if (typeof $ === "boolean") return;
      let B = $[(0, i3.unescapeFragment)(H)];
      if (B === void 0) return;
      $ = B;
      let z = typeof $ === "object" && $[this.opts.schemaId];
      if (!ow.has(H) && z) Q = (0, Q1.resolveUrl)(this.opts.uriResolver, Q, z);
    }
    let J;
    if (
      typeof $ != "boolean" &&
      $.$ref &&
      !(0, i3.schemaHasRulesButRef)($, this.RULES)
    ) {
      let H = (0, Q1.resolveUrl)(this.opts.uriResolver, Q, $.$ref);
      J = T8.call(this, Y, H);
    }
    let { schemaId: G } = this.opts;
    if (
      ((J = J || new rX({ schema: $, schemaId: G, root: Y, baseId: Q })),
      J.schema !== J.root.schema)
    )
      return J;
    return;
  }
});
var t3 = P((zT, XA) => {
  XA.exports = {
    $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    description:
      "Meta-schema for $data reference (JSON AnySchema extension proposal)",
    type: "object",
    required: ["$data"],
    properties: {
      $data: {
        type: "string",
        anyOf: [
          { format: "relative-json-pointer" },
          { format: "json-pointer" },
        ],
      },
    },
    additionalProperties: !1,
  };
});
var s3 = P((KT, a3) => {
  var QA = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    a: 10,
    A: 10,
    b: 11,
    B: 11,
    c: 12,
    C: 12,
    d: 13,
    D: 13,
    e: 14,
    E: 14,
    f: 15,
    F: 15,
  };
  a3.exports = { HEX: QA };
});
var GH = P((UT, JH) => {
  var { HEX: $A } = s3(),
    YA =
      /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u;
  function $H(X) {
    if (WH(X, ".") < 3) return { host: X, isIPV4: !1 };
    let Q = X.match(YA) || [],
      [$] = Q;
    if ($) return { host: JA($, "."), isIPV4: !0 };
    else return { host: X, isIPV4: !1 };
  }
  function PY(X, Q = !1) {
    let $ = "",
      Y = !0;
    for (let W of X) {
      if ($A[W] === void 0) return;
      if (W !== "0" && Y === !0) Y = !1;
      if (!Y) $ += W;
    }
    if (Q && $.length === 0) $ = "0";
    return $;
  }
  function WA(X) {
    let Q = 0,
      $ = { error: !1, address: "", zone: "" },
      Y = [],
      W = [],
      J = !1,
      G = !1,
      H = !1;
    function B() {
      if (W.length) {
        if (J === !1) {
          let z = PY(W);
          if (z !== void 0) Y.push(z);
          else return ($.error = !0), !1;
        }
        W.length = 0;
      }
      return !0;
    }
    for (let z = 0; z < X.length; z++) {
      let K = X[z];
      if (K === "[" || K === "]") continue;
      if (K === ":") {
        if (G === !0) H = !0;
        if (!B()) break;
        if ((Q++, Y.push(":"), Q > 7)) {
          $.error = !0;
          break;
        }
        if (z - 1 >= 0 && X[z - 1] === ":") G = !0;
        continue;
      } else if (K === "%") {
        if (!B()) break;
        J = !0;
      } else {
        W.push(K);
        continue;
      }
    }
    if (W.length)
      if (J) $.zone = W.join("");
      else if (H) Y.push(W.join(""));
      else Y.push(PY(W));
    return ($.address = Y.join("")), $;
  }
  function YH(X) {
    if (WH(X, ":") < 2) return { host: X, isIPV6: !1 };
    let Q = WA(X);
    if (!Q.error) {
      let { address: $, address: Y } = Q;
      if (Q.zone) ($ += "%" + Q.zone), (Y += "%25" + Q.zone);
      return { host: $, escapedHost: Y, isIPV6: !0 };
    } else return { host: X, isIPV6: !1 };
  }
  function JA(X, Q) {
    let $ = "",
      Y = !0,
      W = X.length;
    for (let J = 0; J < W; J++) {
      let G = X[J];
      if (G === "0" && Y) {
        if ((J + 1 <= W && X[J + 1] === Q) || J + 1 === W) ($ += G), (Y = !1);
      } else {
        if (G === Q) Y = !0;
        else Y = !1;
        $ += G;
      }
    }
    return $;
  }
  function WH(X, Q) {
    let $ = 0;
    for (let Y = 0; Y < X.length; Y++) if (X[Y] === Q) $++;
    return $;
  }
  var e3 = /^\.\.?\//u,
    XH = /^\/\.(?:\/|$)/u,
    QH = /^\/\.\.(?:\/|$)/u,
    GA = /^\/?(?:.|\n)*?(?=\/|$)/u;
  function HA(X) {
    let Q = [];
    while (X.length)
      if (X.match(e3)) X = X.replace(e3, "");
      else if (X.match(XH)) X = X.replace(XH, "/");
      else if (X.match(QH)) (X = X.replace(QH, "/")), Q.pop();
      else if (X === "." || X === "..") X = "";
      else {
        let $ = X.match(GA);
        if ($) {
          let Y = $[0];
          (X = X.slice(Y.length)), Q.push(Y);
        } else throw Error("Unexpected dot segment condition");
      }
    return Q.join("");
  }
  function BA(X, Q) {
    let $ = Q !== !0 ? escape : unescape;
    if (X.scheme !== void 0) X.scheme = $(X.scheme);
    if (X.userinfo !== void 0) X.userinfo = $(X.userinfo);
    if (X.host !== void 0) X.host = $(X.host);
    if (X.path !== void 0) X.path = $(X.path);
    if (X.query !== void 0) X.query = $(X.query);
    if (X.fragment !== void 0) X.fragment = $(X.fragment);
    return X;
  }
  function zA(X) {
    let Q = [];
    if (X.userinfo !== void 0) Q.push(X.userinfo), Q.push("@");
    if (X.host !== void 0) {
      let $ = unescape(X.host),
        Y = $H($);
      if (Y.isIPV4) $ = Y.host;
      else {
        let W = YH(Y.host);
        if (W.isIPV6 === !0) $ = `[${W.escapedHost}]`;
        else $ = X.host;
      }
      Q.push($);
    }
    if (typeof X.port === "number" || typeof X.port === "string")
      Q.push(":"), Q.push(String(X.port));
    return Q.length ? Q.join("") : void 0;
  }
  JH.exports = {
    recomposeAuthority: zA,
    normalizeComponentEncoding: BA,
    removeDotSegments: HA,
    normalizeIPv4: $H,
    normalizeIPv6: YH,
    stringArrayToHexStripped: PY,
  };
});
var VH = P((VT, UH) => {
  var KA = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu,
    UA = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
  function HH(X) {
    return typeof X.secure === "boolean"
      ? X.secure
      : String(X.scheme).toLowerCase() === "wss";
  }
  function BH(X) {
    if (!X.host) X.error = X.error || "HTTP URIs must have a host.";
    return X;
  }
  function zH(X) {
    let Q = String(X.scheme).toLowerCase() === "https";
    if (X.port === (Q ? 443 : 80) || X.port === "") X.port = void 0;
    if (!X.path) X.path = "/";
    return X;
  }
  function VA(X) {
    return (
      (X.secure = HH(X)),
      (X.resourceName = (X.path || "/") + (X.query ? "?" + X.query : "")),
      (X.path = void 0),
      (X.query = void 0),
      X
    );
  }
  function LA(X) {
    if (X.port === (HH(X) ? 443 : 80) || X.port === "") X.port = void 0;
    if (typeof X.secure === "boolean")
      (X.scheme = X.secure ? "wss" : "ws"), (X.secure = void 0);
    if (X.resourceName) {
      let [Q, $] = X.resourceName.split("?");
      (X.path = Q && Q !== "/" ? Q : void 0),
        (X.query = $),
        (X.resourceName = void 0);
    }
    return (X.fragment = void 0), X;
  }
  function qA(X, Q) {
    if (!X.path) return (X.error = "URN can not be parsed"), X;
    let $ = X.path.match(UA);
    if ($) {
      let Y = Q.scheme || X.scheme || "urn";
      (X.nid = $[1].toLowerCase()), (X.nss = $[2]);
      let W = `${Y}:${Q.nid || X.nid}`,
        J = SY[W];
      if (((X.path = void 0), J)) X = J.parse(X, Q);
    } else X.error = X.error || "URN can not be parsed.";
    return X;
  }
  function FA(X, Q) {
    let $ = Q.scheme || X.scheme || "urn",
      Y = X.nid.toLowerCase(),
      W = `${$}:${Q.nid || Y}`,
      J = SY[W];
    if (J) X = J.serialize(X, Q);
    let G = X,
      H = X.nss;
    return (G.path = `${Y || Q.nid}:${H}`), (Q.skipEscape = !0), G;
  }
  function NA(X, Q) {
    let $ = X;
    if (
      (($.uuid = $.nss),
      ($.nss = void 0),
      !Q.tolerant && (!$.uuid || !KA.test($.uuid)))
    )
      $.error = $.error || "UUID is not valid.";
    return $;
  }
  function OA(X) {
    let Q = X;
    return (Q.nss = (X.uuid || "").toLowerCase()), Q;
  }
  var KH = { scheme: "http", domainHost: !0, parse: BH, serialize: zH },
    DA = {
      scheme: "https",
      domainHost: KH.domainHost,
      parse: BH,
      serialize: zH,
    },
    x8 = { scheme: "ws", domainHost: !0, parse: VA, serialize: LA },
    wA = {
      scheme: "wss",
      domainHost: x8.domainHost,
      parse: x8.parse,
      serialize: x8.serialize,
    },
    AA = { scheme: "urn", parse: qA, serialize: FA, skipNormalize: !0 },
    MA = { scheme: "urn:uuid", parse: NA, serialize: OA, skipNormalize: !0 },
    SY = { http: KH, https: DA, ws: x8, wss: wA, urn: AA, "urn:uuid": MA };
  UH.exports = SY;
});
var qH = P((LT, g8) => {
  var {
      normalizeIPv6: jA,
      normalizeIPv4: RA,
      removeDotSegments: oX,
      recomposeAuthority: IA,
      normalizeComponentEncoding: y8,
    } = GH(),
    ZY = VH();
  function EA(X, Q) {
    if (typeof X === "string") X = U1(E1(X, Q), Q);
    else if (typeof X === "object") X = E1(U1(X, Q), Q);
    return X;
  }
  function bA(X, Q, $) {
    let Y = Object.assign({ scheme: "null" }, $),
      W = LH(E1(X, Y), E1(Q, Y), Y, !0);
    return U1(W, { ...Y, skipEscape: !0 });
  }
  function LH(X, Q, $, Y) {
    let W = {};
    if (!Y) (X = E1(U1(X, $), $)), (Q = E1(U1(Q, $), $));
    if ((($ = $ || {}), !$.tolerant && Q.scheme))
      (W.scheme = Q.scheme),
        (W.userinfo = Q.userinfo),
        (W.host = Q.host),
        (W.port = Q.port),
        (W.path = oX(Q.path || "")),
        (W.query = Q.query);
    else {
      if (Q.userinfo !== void 0 || Q.host !== void 0 || Q.port !== void 0)
        (W.userinfo = Q.userinfo),
          (W.host = Q.host),
          (W.port = Q.port),
          (W.path = oX(Q.path || "")),
          (W.query = Q.query);
      else {
        if (!Q.path)
          if (((W.path = X.path), Q.query !== void 0)) W.query = Q.query;
          else W.query = X.query;
        else {
          if (Q.path.charAt(0) === "/") W.path = oX(Q.path);
          else {
            if (
              (X.userinfo !== void 0 ||
                X.host !== void 0 ||
                X.port !== void 0) &&
              !X.path
            )
              W.path = "/" + Q.path;
            else if (!X.path) W.path = Q.path;
            else W.path = X.path.slice(0, X.path.lastIndexOf("/") + 1) + Q.path;
            W.path = oX(W.path);
          }
          W.query = Q.query;
        }
        (W.userinfo = X.userinfo), (W.host = X.host), (W.port = X.port);
      }
      W.scheme = X.scheme;
    }
    return (W.fragment = Q.fragment), W;
  }
  function PA(X, Q, $) {
    if (typeof X === "string")
      (X = unescape(X)), (X = U1(y8(E1(X, $), !0), { ...$, skipEscape: !0 }));
    else if (typeof X === "object") X = U1(y8(X, !0), { ...$, skipEscape: !0 });
    if (typeof Q === "string")
      (Q = unescape(Q)), (Q = U1(y8(E1(Q, $), !0), { ...$, skipEscape: !0 }));
    else if (typeof Q === "object") Q = U1(y8(Q, !0), { ...$, skipEscape: !0 });
    return X.toLowerCase() === Q.toLowerCase();
  }
  function U1(X, Q) {
    let $ = {
        host: X.host,
        scheme: X.scheme,
        userinfo: X.userinfo,
        port: X.port,
        path: X.path,
        query: X.query,
        nid: X.nid,
        nss: X.nss,
        uuid: X.uuid,
        fragment: X.fragment,
        reference: X.reference,
        resourceName: X.resourceName,
        secure: X.secure,
        error: "",
      },
      Y = Object.assign({}, Q),
      W = [],
      J = ZY[(Y.scheme || $.scheme || "").toLowerCase()];
    if (J && J.serialize) J.serialize($, Y);
    if ($.path !== void 0)
      if (!Y.skipEscape) {
        if ((($.path = escape($.path)), $.scheme !== void 0))
          $.path = $.path.split("%3A").join(":");
      } else $.path = unescape($.path);
    if (Y.reference !== "suffix" && $.scheme) W.push($.scheme, ":");
    let G = IA($);
    if (G !== void 0) {
      if (Y.reference !== "suffix") W.push("//");
      if ((W.push(G), $.path && $.path.charAt(0) !== "/")) W.push("/");
    }
    if ($.path !== void 0) {
      let H = $.path;
      if (!Y.absolutePath && (!J || !J.absolutePath)) H = oX(H);
      if (G === void 0) H = H.replace(/^\/\//u, "/%2F");
      W.push(H);
    }
    if ($.query !== void 0) W.push("?", $.query);
    if ($.fragment !== void 0) W.push("#", $.fragment);
    return W.join("");
  }
  var SA = Array.from({ length: 127 }, (X, Q) =>
    /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(Q))
  );
  function ZA(X) {
    let Q = 0;
    for (let $ = 0, Y = X.length; $ < Y; ++$)
      if (((Q = X.charCodeAt($)), Q > 126 || SA[Q])) return !0;
    return !1;
  }
  var CA =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function E1(X, Q) {
    let $ = Object.assign({}, Q),
      Y = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0,
      },
      W = X.indexOf("%") !== -1,
      J = !1;
    if ($.reference === "suffix")
      X = ($.scheme ? $.scheme + ":" : "") + "//" + X;
    let G = X.match(CA);
    if (G) {
      if (
        ((Y.scheme = G[1]),
        (Y.userinfo = G[3]),
        (Y.host = G[4]),
        (Y.port = parseInt(G[5], 10)),
        (Y.path = G[6] || ""),
        (Y.query = G[7]),
        (Y.fragment = G[8]),
        isNaN(Y.port))
      )
        Y.port = G[5];
      if (Y.host) {
        let B = RA(Y.host);
        if (B.isIPV4 === !1) {
          let z = jA(B.host);
          (Y.host = z.host.toLowerCase()), (J = z.isIPV6);
        } else (Y.host = B.host), (J = !0);
      }
      if (
        Y.scheme === void 0 &&
        Y.userinfo === void 0 &&
        Y.host === void 0 &&
        Y.port === void 0 &&
        Y.query === void 0 &&
        !Y.path
      )
        Y.reference = "same-document";
      else if (Y.scheme === void 0) Y.reference = "relative";
      else if (Y.fragment === void 0) Y.reference = "absolute";
      else Y.reference = "uri";
      if (
        $.reference &&
        $.reference !== "suffix" &&
        $.reference !== Y.reference
      )
        Y.error = Y.error || "URI is not a " + $.reference + " reference.";
      let H = ZY[($.scheme || Y.scheme || "").toLowerCase()];
      if (!$.unicodeSupport && (!H || !H.unicodeSupport)) {
        if (
          Y.host &&
          ($.domainHost || (H && H.domainHost)) &&
          J === !1 &&
          ZA(Y.host)
        )
          try {
            Y.host = URL.domainToASCII(Y.host.toLowerCase());
          } catch (B) {
            Y.error =
              Y.error ||
              "Host's domain name can not be converted to ASCII: " + B;
          }
      }
      if (!H || (H && !H.skipNormalize)) {
        if (W && Y.scheme !== void 0) Y.scheme = unescape(Y.scheme);
        if (W && Y.host !== void 0) Y.host = unescape(Y.host);
        if (Y.path) Y.path = escape(unescape(Y.path));
        if (Y.fragment) Y.fragment = encodeURI(decodeURIComponent(Y.fragment));
      }
      if (H && H.parse) H.parse(Y, $);
    } else Y.error = Y.error || "URI can not be parsed.";
    return Y;
  }
  var CY = {
    SCHEMES: ZY,
    normalize: EA,
    resolve: bA,
    resolveComponents: LH,
    equal: PA,
    serialize: U1,
    parse: E1,
  };
  g8.exports = CY;
  g8.exports.default = CY;
  g8.exports.fastUri = CY;
});
var OH = P((NH) => {
  Object.defineProperty(NH, "__esModule", { value: !0 });
  var FH = qH();
  FH.code = 'require("ajv/dist/runtime/uri").default';
  NH.default = FH;
});
var EH = P((b1) => {
  Object.defineProperty(b1, "__esModule", { value: !0 });
  b1.CodeGen =
    b1.Name =
    b1.nil =
    b1.stringify =
    b1.str =
    b1._ =
    b1.KeywordCxt =
      void 0;
  var vA = iX();
  Object.defineProperty(b1, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return vA.KeywordCxt;
    },
  });
  var c6 = p();
  Object.defineProperty(b1, "_", {
    enumerable: !0,
    get: function () {
      return c6._;
    },
  });
  Object.defineProperty(b1, "str", {
    enumerable: !0,
    get: function () {
      return c6.str;
    },
  });
  Object.defineProperty(b1, "stringify", {
    enumerable: !0,
    get: function () {
      return c6.stringify;
    },
  });
  Object.defineProperty(b1, "nil", {
    enumerable: !0,
    get: function () {
      return c6.nil;
    },
  });
  Object.defineProperty(b1, "Name", {
    enumerable: !0,
    get: function () {
      return c6.Name;
    },
  });
  Object.defineProperty(b1, "CodeGen", {
    enumerable: !0,
    get: function () {
      return c6.CodeGen;
    },
  });
  var TA = v8(),
    jH = nX(),
    _A = KY(),
    tX = _8(),
    xA = p(),
    aX = cX(),
    f8 = mX(),
    vY = e(),
    DH = t3(),
    yA = OH(),
    RH = (X, Q) => new RegExp(X, Q);
  RH.code = "new RegExp";
  var gA = ["removeAdditional", "useDefaults", "coerceTypes"],
    fA = new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error",
    ]),
    hA = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs:
        "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode:
        "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats:
        "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now.",
    },
    uA = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode:
        '"minLength"/"maxLength" account for unicode characters by default.',
    },
    wH = 200;
  function lA(X) {
    var Q,
      $,
      Y,
      W,
      J,
      G,
      H,
      B,
      z,
      K,
      V,
      L,
      U,
      F,
      q,
      N,
      w,
      M,
      R,
      S,
      C,
      K0,
      U0,
      s,
      D0;
    let q0 = X.strict,
      L1 = (Q = X.code) === null || Q === void 0 ? void 0 : Q.optimize,
      P1 = L1 === !0 || L1 === void 0 ? 1 : L1 || 0,
      o1 =
        (Y = ($ = X.code) === null || $ === void 0 ? void 0 : $.regExp) !==
          null && Y !== void 0
          ? Y
          : RH,
      c = (W = X.uriResolver) !== null && W !== void 0 ? W : yA.default;
    return {
      strictSchema:
        (G = (J = X.strictSchema) !== null && J !== void 0 ? J : q0) !== null &&
        G !== void 0
          ? G
          : !0,
      strictNumbers:
        (B = (H = X.strictNumbers) !== null && H !== void 0 ? H : q0) !==
          null && B !== void 0
          ? B
          : !0,
      strictTypes:
        (K = (z = X.strictTypes) !== null && z !== void 0 ? z : q0) !== null &&
        K !== void 0
          ? K
          : "log",
      strictTuples:
        (L = (V = X.strictTuples) !== null && V !== void 0 ? V : q0) !== null &&
        L !== void 0
          ? L
          : "log",
      strictRequired:
        (F = (U = X.strictRequired) !== null && U !== void 0 ? U : q0) !==
          null && F !== void 0
          ? F
          : !1,
      code: X.code
        ? { ...X.code, optimize: P1, regExp: o1 }
        : { optimize: P1, regExp: o1 },
      loopRequired: (q = X.loopRequired) !== null && q !== void 0 ? q : wH,
      loopEnum: (N = X.loopEnum) !== null && N !== void 0 ? N : wH,
      meta: (w = X.meta) !== null && w !== void 0 ? w : !0,
      messages: (M = X.messages) !== null && M !== void 0 ? M : !0,
      inlineRefs: (R = X.inlineRefs) !== null && R !== void 0 ? R : !0,
      schemaId: (S = X.schemaId) !== null && S !== void 0 ? S : "$id",
      addUsedSchema: (C = X.addUsedSchema) !== null && C !== void 0 ? C : !0,
      validateSchema:
        (K0 = X.validateSchema) !== null && K0 !== void 0 ? K0 : !0,
      validateFormats:
        (U0 = X.validateFormats) !== null && U0 !== void 0 ? U0 : !0,
      unicodeRegExp: (s = X.unicodeRegExp) !== null && s !== void 0 ? s : !0,
      int32range: (D0 = X.int32range) !== null && D0 !== void 0 ? D0 : !0,
      uriResolver: c,
    };
  }
  class h8 {
    constructor(X = {}) {
      (this.schemas = {}),
        (this.refs = {}),
        (this.formats = {}),
        (this._compilations = new Set()),
        (this._loading = {}),
        (this._cache = new Map()),
        (X = this.opts = { ...X, ...lA(X) });
      let { es5: Q, lines: $ } = this.opts.code;
      (this.scope = new xA.ValueScope({
        scope: {},
        prefixes: fA,
        es5: Q,
        lines: $,
      })),
        (this.logger = nA(X.logger));
      let Y = X.validateFormats;
      if (
        ((X.validateFormats = !1),
        (this.RULES = (0, _A.getRules)()),
        AH.call(this, hA, X, "NOT SUPPORTED"),
        AH.call(this, uA, X, "DEPRECATED", "warn"),
        (this._metaOpts = dA.call(this)),
        X.formats)
      )
        cA.call(this);
      if ((this._addVocabularies(), this._addDefaultMetaSchema(), X.keywords))
        pA.call(this, X.keywords);
      if (typeof X.meta == "object") this.addMetaSchema(X.meta);
      mA.call(this), (X.validateFormats = Y);
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      let { $data: X, meta: Q, schemaId: $ } = this.opts,
        Y = DH;
      if ($ === "id") (Y = { ...DH }), (Y.id = Y.$id), delete Y.$id;
      if (Q && X) this.addMetaSchema(Y, Y[$], !1);
    }
    defaultMeta() {
      let { meta: X, schemaId: Q } = this.opts;
      return (this.opts.defaultMeta =
        typeof X == "object" ? X[Q] || X : void 0);
    }
    validate(X, Q) {
      let $;
      if (typeof X == "string") {
        if ((($ = this.getSchema(X)), !$))
          throw Error(`no schema with key or ref "${X}"`);
      } else $ = this.compile(X);
      let Y = $(Q);
      if (!("$async" in $)) this.errors = $.errors;
      return Y;
    }
    compile(X, Q) {
      let $ = this._addSchema(X, Q);
      return $.validate || this._compileSchemaEnv($);
    }
    compileAsync(X, Q) {
      if (typeof this.opts.loadSchema != "function")
        throw Error("options.loadSchema should be a function");
      let { loadSchema: $ } = this.opts;
      return Y.call(this, X, Q);
      async function Y(z, K) {
        await W.call(this, z.$schema);
        let V = this._addSchema(z, K);
        return V.validate || J.call(this, V);
      }
      async function W(z) {
        if (z && !this.getSchema(z)) await Y.call(this, { $ref: z }, !0);
      }
      async function J(z) {
        try {
          return this._compileSchemaEnv(z);
        } catch (K) {
          if (!(K instanceof jH.default)) throw K;
          return (
            G.call(this, K),
            await H.call(this, K.missingSchema),
            J.call(this, z)
          );
        }
      }
      function G({ missingSchema: z, missingRef: K }) {
        if (this.refs[z])
          throw Error(`AnySchema ${z} is loaded but ${K} cannot be resolved`);
      }
      async function H(z) {
        let K = await B.call(this, z);
        if (!this.refs[z]) await W.call(this, K.$schema);
        if (!this.refs[z]) this.addSchema(K, z, Q);
      }
      async function B(z) {
        let K = this._loading[z];
        if (K) return K;
        try {
          return await (this._loading[z] = $(z));
        } finally {
          delete this._loading[z];
        }
      }
    }
    addSchema(X, Q, $, Y = this.opts.validateSchema) {
      if (Array.isArray(X)) {
        for (let J of X) this.addSchema(J, void 0, $, Y);
        return this;
      }
      let W;
      if (typeof X === "object") {
        let { schemaId: J } = this.opts;
        if (((W = X[J]), W !== void 0 && typeof W != "string"))
          throw Error(`schema ${J} must be string`);
      }
      return (
        (Q = (0, aX.normalizeId)(Q || W)),
        this._checkUnique(Q),
        (this.schemas[Q] = this._addSchema(X, $, Q, Y, !0)),
        this
      );
    }
    addMetaSchema(X, Q, $ = this.opts.validateSchema) {
      return this.addSchema(X, Q, !0, $), this;
    }
    validateSchema(X, Q) {
      if (typeof X == "boolean") return !0;
      let $;
      if ((($ = X.$schema), $ !== void 0 && typeof $ != "string"))
        throw Error("$schema must be a string");
      if ((($ = $ || this.opts.defaultMeta || this.defaultMeta()), !$))
        return (
          this.logger.warn("meta-schema not available"),
          (this.errors = null),
          !0
        );
      let Y = this.validate($, X);
      if (!Y && Q) {
        let W = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(W);
        else throw Error(W);
      }
      return Y;
    }
    getSchema(X) {
      let Q;
      while (typeof (Q = MH.call(this, X)) == "string") X = Q;
      if (Q === void 0) {
        let { schemaId: $ } = this.opts,
          Y = new tX.SchemaEnv({ schema: {}, schemaId: $ });
        if (((Q = tX.resolveSchema.call(this, Y, X)), !Q)) return;
        this.refs[X] = Q;
      }
      return Q.validate || this._compileSchemaEnv(Q);
    }
    removeSchema(X) {
      if (X instanceof RegExp)
        return (
          this._removeAllSchemas(this.schemas, X),
          this._removeAllSchemas(this.refs, X),
          this
        );
      switch (typeof X) {
        case "undefined":
          return (
            this._removeAllSchemas(this.schemas),
            this._removeAllSchemas(this.refs),
            this._cache.clear(),
            this
          );
        case "string": {
          let Q = MH.call(this, X);
          if (typeof Q == "object") this._cache.delete(Q.schema);
          return delete this.schemas[X], delete this.refs[X], this;
        }
        case "object": {
          let Q = X;
          this._cache.delete(Q);
          let $ = X[this.opts.schemaId];
          if ($)
            ($ = (0, aX.normalizeId)($)),
              delete this.schemas[$],
              delete this.refs[$];
          return this;
        }
        default:
          throw Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary(X) {
      for (let Q of X) this.addKeyword(Q);
      return this;
    }
    addKeyword(X, Q) {
      let $;
      if (typeof X == "string") {
        if ((($ = X), typeof Q == "object"))
          this.logger.warn(
            "these parameters are deprecated, see docs for addKeyword"
          ),
            (Q.keyword = $);
      } else if (typeof X == "object" && Q === void 0) {
        if (((Q = X), ($ = Q.keyword), Array.isArray($) && !$.length))
          throw Error("addKeywords: keyword must be string or non-empty array");
      } else throw Error("invalid addKeywords parameters");
      if ((oA.call(this, $, Q), !Q))
        return (0, vY.eachItem)($, (W) => kY.call(this, W)), this;
      aA.call(this, Q);
      let Y = {
        ...Q,
        type: (0, f8.getJSONTypes)(Q.type),
        schemaType: (0, f8.getJSONTypes)(Q.schemaType),
      };
      return (
        (0, vY.eachItem)(
          $,
          Y.type.length === 0
            ? (W) => kY.call(this, W, Y)
            : (W) => Y.type.forEach((J) => kY.call(this, W, Y, J))
        ),
        this
      );
    }
    getKeyword(X) {
      let Q = this.RULES.all[X];
      return typeof Q == "object" ? Q.definition : !!Q;
    }
    removeKeyword(X) {
      let { RULES: Q } = this;
      delete Q.keywords[X], delete Q.all[X];
      for (let $ of Q.rules) {
        let Y = $.rules.findIndex((W) => W.keyword === X);
        if (Y >= 0) $.rules.splice(Y, 1);
      }
      return this;
    }
    addFormat(X, Q) {
      if (typeof Q == "string") Q = new RegExp(Q);
      return (this.formats[X] = Q), this;
    }
    errorsText(
      X = this.errors,
      { separator: Q = ", ", dataVar: $ = "data" } = {}
    ) {
      if (!X || X.length === 0) return "No errors";
      return X.map((Y) => `${$}${Y.instancePath} ${Y.message}`).reduce(
        (Y, W) => Y + Q + W
      );
    }
    $dataMetaSchema(X, Q) {
      let $ = this.RULES.all;
      X = JSON.parse(JSON.stringify(X));
      for (let Y of Q) {
        let W = Y.split("/").slice(1),
          J = X;
        for (let G of W) J = J[G];
        for (let G in $) {
          let H = $[G];
          if (typeof H != "object") continue;
          let { $data: B } = H.definition,
            z = J[G];
          if (B && z) J[G] = IH(z);
        }
      }
      return X;
    }
    _removeAllSchemas(X, Q) {
      for (let $ in X) {
        let Y = X[$];
        if (!Q || Q.test($)) {
          if (typeof Y == "string") delete X[$];
          else if (Y && !Y.meta) this._cache.delete(Y.schema), delete X[$];
        }
      }
    }
    _addSchema(
      X,
      Q,
      $,
      Y = this.opts.validateSchema,
      W = this.opts.addUsedSchema
    ) {
      let J,
        { schemaId: G } = this.opts;
      if (typeof X == "object") J = X[G];
      else if (this.opts.jtd) throw Error("schema must be object");
      else if (typeof X != "boolean")
        throw Error("schema must be object or boolean");
      let H = this._cache.get(X);
      if (H !== void 0) return H;
      $ = (0, aX.normalizeId)(J || $);
      let B = aX.getSchemaRefs.call(this, X, $);
      if (
        ((H = new tX.SchemaEnv({
          schema: X,
          schemaId: G,
          meta: Q,
          baseId: $,
          localRefs: B,
        })),
        this._cache.set(H.schema, H),
        W && !$.startsWith("#"))
      ) {
        if ($) this._checkUnique($);
        this.refs[$] = H;
      }
      if (Y) this.validateSchema(X, !0);
      return H;
    }
    _checkUnique(X) {
      if (this.schemas[X] || this.refs[X])
        throw Error(`schema with key or id "${X}" already exists`);
    }
    _compileSchemaEnv(X) {
      if (X.meta) this._compileMetaSchema(X);
      else tX.compileSchema.call(this, X);
      if (!X.validate) throw Error("ajv implementation error");
      return X.validate;
    }
    _compileMetaSchema(X) {
      let Q = this.opts;
      this.opts = this._metaOpts;
      try {
        tX.compileSchema.call(this, X);
      } finally {
        this.opts = Q;
      }
    }
  }
  h8.ValidationError = TA.default;
  h8.MissingRefError = jH.default;
  b1.default = h8;
  function AH(X, Q, $, Y = "error") {
    for (let W in X) {
      let J = W;
      if (J in Q) this.logger[Y](`${$}: option ${W}. ${X[J]}`);
    }
  }
  function MH(X) {
    return (X = (0, aX.normalizeId)(X)), this.schemas[X] || this.refs[X];
  }
  function mA() {
    let X = this.opts.schemas;
    if (!X) return;
    if (Array.isArray(X)) this.addSchema(X);
    else for (let Q in X) this.addSchema(X[Q], Q);
  }
  function cA() {
    for (let X in this.opts.formats) {
      let Q = this.opts.formats[X];
      if (Q) this.addFormat(X, Q);
    }
  }
  function pA(X) {
    if (Array.isArray(X)) {
      this.addVocabulary(X);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (let Q in X) {
      let $ = X[Q];
      if (!$.keyword) $.keyword = Q;
      this.addKeyword($);
    }
  }
  function dA() {
    let X = { ...this.opts };
    for (let Q of gA) delete X[Q];
    return X;
  }
  var iA = { log() {}, warn() {}, error() {} };
  function nA(X) {
    if (X === !1) return iA;
    if (X === void 0) return console;
    if (X.log && X.warn && X.error) return X;
    throw Error("logger must implement log, warn and error methods");
  }
  var rA = /^[a-z_$][a-z0-9_$:-]*$/i;
  function oA(X, Q) {
    let { RULES: $ } = this;
    if (
      ((0, vY.eachItem)(X, (Y) => {
        if ($.keywords[Y]) throw Error(`Keyword ${Y} is already defined`);
        if (!rA.test(Y)) throw Error(`Keyword ${Y} has invalid name`);
      }),
      !Q)
    )
      return;
    if (Q.$data && !("code" in Q || "validate" in Q))
      throw Error('$data keyword must have "code" or "validate" function');
  }
  function kY(X, Q, $) {
    var Y;
    let W = Q === null || Q === void 0 ? void 0 : Q.post;
    if ($ && W) throw Error('keyword with "post" flag cannot have "type"');
    let { RULES: J } = this,
      G = W ? J.post : J.rules.find(({ type: B }) => B === $);
    if (!G) (G = { type: $, rules: [] }), J.rules.push(G);
    if (((J.keywords[X] = !0), !Q)) return;
    let H = {
      keyword: X,
      definition: {
        ...Q,
        type: (0, f8.getJSONTypes)(Q.type),
        schemaType: (0, f8.getJSONTypes)(Q.schemaType),
      },
    };
    if (Q.before) tA.call(this, G, H, Q.before);
    else G.rules.push(H);
    (J.all[X] = H),
      (Y = Q.implements) === null ||
        Y === void 0 ||
        Y.forEach((B) => this.addKeyword(B));
  }
  function tA(X, Q, $) {
    let Y = X.rules.findIndex((W) => W.keyword === $);
    if (Y >= 0) X.rules.splice(Y, 0, Q);
    else X.rules.push(Q), this.logger.warn(`rule ${$} is not defined`);
  }
  function aA(X) {
    let { metaSchema: Q } = X;
    if (Q === void 0) return;
    if (X.$data && this.opts.$data) Q = IH(Q);
    X.validateSchema = this.compile(Q, !0);
  }
  var sA = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
  };
  function IH(X) {
    return { anyOf: [X, sA] };
  }
});
var PH = P((bH) => {
  Object.defineProperty(bH, "__esModule", { value: !0 });
  var QM = {
    keyword: "id",
    code() {
      throw Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
    },
  };
  bH.default = QM;
});
var TH = P((kH) => {
  Object.defineProperty(kH, "__esModule", { value: !0 });
  kH.callRef = kH.getValidate = void 0;
  var YM = nX(),
    SH = d0(),
    g0 = p(),
    p6 = R1(),
    ZH = _8(),
    u8 = e(),
    WM = {
      keyword: "$ref",
      schemaType: "string",
      code(X) {
        let { gen: Q, schema: $, it: Y } = X,
          { baseId: W, schemaEnv: J, validateName: G, opts: H, self: B } = Y,
          { root: z } = J;
        if (($ === "#" || $ === "#/") && W === z.baseId) return V();
        let K = ZH.resolveRef.call(B, z, W, $);
        if (K === void 0) throw new YM.default(Y.opts.uriResolver, W, $);
        if (K instanceof ZH.SchemaEnv) return L(K);
        return U(K);
        function V() {
          if (J === z) return l8(X, G, J, J.$async);
          let F = Q.scopeValue("root", { ref: z });
          return l8(X, g0._`${F}.validate`, z, z.$async);
        }
        function L(F) {
          let q = CH(X, F);
          l8(X, q, F, F.$async);
        }
        function U(F) {
          let q = Q.scopeValue(
              "schema",
              H.code.source === !0
                ? { ref: F, code: (0, g0.stringify)(F) }
                : { ref: F }
            ),
            N = Q.name("valid"),
            w = X.subschema(
              {
                schema: F,
                dataTypes: [],
                schemaPath: g0.nil,
                topSchemaRef: q,
                errSchemaPath: $,
              },
              N
            );
          X.mergeEvaluated(w), X.ok(N);
        }
      },
    };
  function CH(X, Q) {
    let { gen: $ } = X;
    return Q.validate
      ? $.scopeValue("validate", { ref: Q.validate })
      : g0._`${$.scopeValue("wrapper", { ref: Q })}.validate`;
  }
  kH.getValidate = CH;
  function l8(X, Q, $, Y) {
    let { gen: W, it: J } = X,
      { allErrors: G, schemaEnv: H, opts: B } = J,
      z = B.passContext ? p6.default.this : g0.nil;
    if (Y) K();
    else V();
    function K() {
      if (!H.$async) throw Error("async schema referenced by sync schema");
      let F = W.let("valid");
      W.try(
        () => {
          if (
            (W.code(g0._`await ${(0, SH.callValidateCode)(X, Q, z)}`), U(Q), !G)
          )
            W.assign(F, !0);
        },
        (q) => {
          if (
            (W.if(g0._`!(${q} instanceof ${J.ValidationError})`, () =>
              W.throw(q)
            ),
            L(q),
            !G)
          )
            W.assign(F, !1);
        }
      ),
        X.ok(F);
    }
    function V() {
      X.result(
        (0, SH.callValidateCode)(X, Q, z),
        () => U(Q),
        () => L(Q)
      );
    }
    function L(F) {
      let q = g0._`${F}.errors`;
      W.assign(
        p6.default.vErrors,
        g0._`${p6.default.vErrors} === null ? ${q} : ${p6.default.vErrors}.concat(${q})`
      ),
        W.assign(p6.default.errors, g0._`${p6.default.vErrors}.length`);
    }
    function U(F) {
      var q;
      if (!J.opts.unevaluated) return;
      let N =
        (q = $ === null || $ === void 0 ? void 0 : $.validate) === null ||
        q === void 0
          ? void 0
          : q.evaluated;
      if (J.props !== !0)
        if (N && !N.dynamicProps) {
          if (N.props !== void 0)
            J.props = u8.mergeEvaluated.props(W, N.props, J.props);
        } else {
          let w = W.var("props", g0._`${F}.evaluated.props`);
          J.props = u8.mergeEvaluated.props(W, w, J.props, g0.Name);
        }
      if (J.items !== !0)
        if (N && !N.dynamicItems) {
          if (N.items !== void 0)
            J.items = u8.mergeEvaluated.items(W, N.items, J.items);
        } else {
          let w = W.var("items", g0._`${F}.evaluated.items`);
          J.items = u8.mergeEvaluated.items(W, w, J.items, g0.Name);
        }
    }
  }
  kH.callRef = l8;
  kH.default = WM;
});
var xH = P((_H) => {
  Object.defineProperty(_H, "__esModule", { value: !0 });
  var HM = PH(),
    BM = TH(),
    zM = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      HM.default,
      BM.default,
    ];
  _H.default = zM;
});
var gH = P((yH) => {
  Object.defineProperty(yH, "__esModule", { value: !0 });
  var m8 = p(),
    i1 = m8.operators,
    c8 = {
      maximum: { okStr: "<=", ok: i1.LTE, fail: i1.GT },
      minimum: { okStr: ">=", ok: i1.GTE, fail: i1.LT },
      exclusiveMaximum: { okStr: "<", ok: i1.LT, fail: i1.GTE },
      exclusiveMinimum: { okStr: ">", ok: i1.GT, fail: i1.LTE },
    },
    UM = {
      message: ({ keyword: X, schemaCode: Q }) =>
        m8.str`must be ${c8[X].okStr} ${Q}`,
      params: ({ keyword: X, schemaCode: Q }) =>
        m8._`{comparison: ${c8[X].okStr}, limit: ${Q}}`,
    },
    VM = {
      keyword: Object.keys(c8),
      type: "number",
      schemaType: "number",
      $data: !0,
      error: UM,
      code(X) {
        let { keyword: Q, data: $, schemaCode: Y } = X;
        X.fail$data(m8._`${$} ${c8[Q].fail} ${Y} || isNaN(${$})`);
      },
    };
  yH.default = VM;
});
var hH = P((fH) => {
  Object.defineProperty(fH, "__esModule", { value: !0 });
  var sX = p(),
    qM = {
      message: ({ schemaCode: X }) => sX.str`must be multiple of ${X}`,
      params: ({ schemaCode: X }) => sX._`{multipleOf: ${X}}`,
    },
    FM = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: !0,
      error: qM,
      code(X) {
        let { gen: Q, data: $, schemaCode: Y, it: W } = X,
          J = W.opts.multipleOfPrecision,
          G = Q.let("res"),
          H = J
            ? sX._`Math.abs(Math.round(${G}) - ${G}) > 1e-${J}`
            : sX._`${G} !== parseInt(${G})`;
        X.fail$data(sX._`(${Y} === 0 || (${G} = ${$}/${Y}, ${H}))`);
      },
    };
  fH.default = FM;
});
var mH = P((lH) => {
  Object.defineProperty(lH, "__esModule", { value: !0 });
  function uH(X) {
    let Q = X.length,
      $ = 0,
      Y = 0,
      W;
    while (Y < Q)
      if (($++, (W = X.charCodeAt(Y++)), W >= 55296 && W <= 56319 && Y < Q)) {
        if (((W = X.charCodeAt(Y)), (W & 64512) === 56320)) Y++;
      }
    return $;
  }
  lH.default = uH;
  uH.code = 'require("ajv/dist/runtime/ucs2length").default';
});
var pH = P((cH) => {
  Object.defineProperty(cH, "__esModule", { value: !0 });
  var K6 = p(),
    DM = e(),
    wM = mH(),
    AM = {
      message({ keyword: X, schemaCode: Q }) {
        let $ = X === "maxLength" ? "more" : "fewer";
        return K6.str`must NOT have ${$} than ${Q} characters`;
      },
      params: ({ schemaCode: X }) => K6._`{limit: ${X}}`,
    },
    MM = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: !0,
      error: AM,
      code(X) {
        let { keyword: Q, data: $, schemaCode: Y, it: W } = X,
          J = Q === "maxLength" ? K6.operators.GT : K6.operators.LT,
          G =
            W.opts.unicode === !1
              ? K6._`${$}.length`
              : K6._`${(0, DM.useFunc)(X.gen, wM.default)}(${$})`;
        X.fail$data(K6._`${G} ${J} ${Y}`);
      },
    };
  cH.default = MM;
});
var iH = P((dH) => {
  Object.defineProperty(dH, "__esModule", { value: !0 });
  var RM = d0(),
    p8 = p(),
    IM = {
      message: ({ schemaCode: X }) => p8.str`must match pattern "${X}"`,
      params: ({ schemaCode: X }) => p8._`{pattern: ${X}}`,
    },
    EM = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: !0,
      error: IM,
      code(X) {
        let { data: Q, $data: $, schema: Y, schemaCode: W, it: J } = X,
          G = J.opts.unicodeRegExp ? "u" : "",
          H = $ ? p8._`(new RegExp(${W}, ${G}))` : (0, RM.usePattern)(X, Y);
        X.fail$data(p8._`!${H}.test(${Q})`);
      },
    };
  dH.default = EM;
});
var rH = P((nH) => {
  Object.defineProperty(nH, "__esModule", { value: !0 });
  var eX = p(),
    PM = {
      message({ keyword: X, schemaCode: Q }) {
        let $ = X === "maxProperties" ? "more" : "fewer";
        return eX.str`must NOT have ${$} than ${Q} properties`;
      },
      params: ({ schemaCode: X }) => eX._`{limit: ${X}}`,
    },
    SM = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: !0,
      error: PM,
      code(X) {
        let { keyword: Q, data: $, schemaCode: Y } = X,
          W = Q === "maxProperties" ? eX.operators.GT : eX.operators.LT;
        X.fail$data(eX._`Object.keys(${$}).length ${W} ${Y}`);
      },
    };
  nH.default = SM;
});
var tH = P((oH) => {
  Object.defineProperty(oH, "__esModule", { value: !0 });
  var X4 = d0(),
    Q4 = p(),
    CM = e(),
    kM = {
      message: ({ params: { missingProperty: X } }) =>
        Q4.str`must have required property '${X}'`,
      params: ({ params: { missingProperty: X } }) =>
        Q4._`{missingProperty: ${X}}`,
    },
    vM = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: !0,
      error: kM,
      code(X) {
        let { gen: Q, schema: $, schemaCode: Y, data: W, $data: J, it: G } = X,
          { opts: H } = G;
        if (!J && $.length === 0) return;
        let B = $.length >= H.loopRequired;
        if (G.allErrors) z();
        else K();
        if (H.strictRequired) {
          let U = X.parentSchema.properties,
            { definedProperties: F } = X.it;
          for (let q of $)
            if (
              (U === null || U === void 0 ? void 0 : U[q]) === void 0 &&
              !F.has(q)
            ) {
              let N = G.schemaEnv.baseId + G.errSchemaPath,
                w = `required property "${q}" is not defined at "${N}" (strictRequired)`;
              (0, CM.checkStrictMode)(G, w, G.opts.strictRequired);
            }
        }
        function z() {
          if (B || J) X.block$data(Q4.nil, V);
          else for (let U of $) (0, X4.checkReportMissingProp)(X, U);
        }
        function K() {
          let U = Q.let("missing");
          if (B || J) {
            let F = Q.let("valid", !0);
            X.block$data(F, () => L(U, F)), X.ok(F);
          } else
            Q.if((0, X4.checkMissingProp)(X, $, U)),
              (0, X4.reportMissingProp)(X, U),
              Q.else();
        }
        function V() {
          Q.forOf("prop", Y, (U) => {
            X.setParams({ missingProperty: U }),
              Q.if((0, X4.noPropertyInData)(Q, W, U, H.ownProperties), () =>
                X.error()
              );
          });
        }
        function L(U, F) {
          X.setParams({ missingProperty: U }),
            Q.forOf(
              U,
              Y,
              () => {
                Q.assign(F, (0, X4.propertyInData)(Q, W, U, H.ownProperties)),
                  Q.if((0, Q4.not)(F), () => {
                    X.error(), Q.break();
                  });
              },
              Q4.nil
            );
        }
      },
    };
  oH.default = vM;
});
var sH = P((aH) => {
  Object.defineProperty(aH, "__esModule", { value: !0 });
  var $4 = p(),
    _M = {
      message({ keyword: X, schemaCode: Q }) {
        let $ = X === "maxItems" ? "more" : "fewer";
        return $4.str`must NOT have ${$} than ${Q} items`;
      },
      params: ({ schemaCode: X }) => $4._`{limit: ${X}}`,
    },
    xM = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: !0,
      error: _M,
      code(X) {
        let { keyword: Q, data: $, schemaCode: Y } = X,
          W = Q === "maxItems" ? $4.operators.GT : $4.operators.LT;
        X.fail$data($4._`${$}.length ${W} ${Y}`);
      },
    };
  aH.default = xM;
});
var d8 = P((XB) => {
  Object.defineProperty(XB, "__esModule", { value: !0 });
  var eH = DY();
  eH.code = 'require("ajv/dist/runtime/equal").default';
  XB.default = eH;
});
var $B = P((QB) => {
  Object.defineProperty(QB, "__esModule", { value: !0 });
  var TY = mX(),
    I0 = p(),
    fM = e(),
    hM = d8(),
    uM = {
      message: ({ params: { i: X, j: Q } }) =>
        I0.str`must NOT have duplicate items (items ## ${Q} and ${X} are identical)`,
      params: ({ params: { i: X, j: Q } }) => I0._`{i: ${X}, j: ${Q}}`,
    },
    lM = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: !0,
      error: uM,
      code(X) {
        let {
          gen: Q,
          data: $,
          $data: Y,
          schema: W,
          parentSchema: J,
          schemaCode: G,
          it: H,
        } = X;
        if (!Y && !W) return;
        let B = Q.let("valid"),
          z = J.items ? (0, TY.getSchemaTypes)(J.items) : [];
        X.block$data(B, K, I0._`${G} === false`), X.ok(B);
        function K() {
          let F = Q.let("i", I0._`${$}.length`),
            q = Q.let("j");
          X.setParams({ i: F, j: q }),
            Q.assign(B, !0),
            Q.if(I0._`${F} > 1`, () => (V() ? L : U)(F, q));
        }
        function V() {
          return (
            z.length > 0 && !z.some((F) => F === "object" || F === "array")
          );
        }
        function L(F, q) {
          let N = Q.name("item"),
            w = (0, TY.checkDataTypes)(
              z,
              N,
              H.opts.strictNumbers,
              TY.DataType.Wrong
            ),
            M = Q.const("indices", I0._`{}`);
          Q.for(I0._`;${F}--;`, () => {
            if (
              (Q.let(N, I0._`${$}[${F}]`),
              Q.if(w, I0._`continue`),
              z.length > 1)
            )
              Q.if(I0._`typeof ${N} == "string"`, I0._`${N} += "_"`);
            Q.if(I0._`typeof ${M}[${N}] == "number"`, () => {
              Q.assign(q, I0._`${M}[${N}]`), X.error(), Q.assign(B, !1).break();
            }).code(I0._`${M}[${N}] = ${F}`);
          });
        }
        function U(F, q) {
          let N = (0, fM.useFunc)(Q, hM.default),
            w = Q.name("outer");
          Q.label(w).for(I0._`;${F}--;`, () =>
            Q.for(I0._`${q} = ${F}; ${q}--;`, () =>
              Q.if(I0._`${N}(${$}[${F}], ${$}[${q}])`, () => {
                X.error(), Q.assign(B, !1).break(w);
              })
            )
          );
        }
      },
    };
  QB.default = lM;
});
var WB = P((YB) => {
  Object.defineProperty(YB, "__esModule", { value: !0 });
  var _Y = p(),
    cM = e(),
    pM = d8(),
    dM = {
      message: "must be equal to constant",
      params: ({ schemaCode: X }) => _Y._`{allowedValue: ${X}}`,
    },
    iM = {
      keyword: "const",
      $data: !0,
      error: dM,
      code(X) {
        let { gen: Q, data: $, $data: Y, schemaCode: W, schema: J } = X;
        if (Y || (J && typeof J == "object"))
          X.fail$data(_Y._`!${(0, cM.useFunc)(Q, pM.default)}(${$}, ${W})`);
        else X.fail(_Y._`${J} !== ${$}`);
      },
    };
  YB.default = iM;
});
var GB = P((JB) => {
  Object.defineProperty(JB, "__esModule", { value: !0 });
  var Y4 = p(),
    rM = e(),
    oM = d8(),
    tM = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode: X }) => Y4._`{allowedValues: ${X}}`,
    },
    aM = {
      keyword: "enum",
      schemaType: "array",
      $data: !0,
      error: tM,
      code(X) {
        let { gen: Q, data: $, $data: Y, schema: W, schemaCode: J, it: G } = X;
        if (!Y && W.length === 0) throw Error("enum must have non-empty array");
        let H = W.length >= G.opts.loopEnum,
          B,
          z = () =>
            B !== null && B !== void 0
              ? B
              : (B = (0, rM.useFunc)(Q, oM.default)),
          K;
        if (H || Y) (K = Q.let("valid")), X.block$data(K, V);
        else {
          if (!Array.isArray(W)) throw Error("ajv implementation error");
          let U = Q.const("vSchema", J);
          K = (0, Y4.or)(...W.map((F, q) => L(U, q)));
        }
        X.pass(K);
        function V() {
          Q.assign(K, !1),
            Q.forOf("v", J, (U) =>
              Q.if(Y4._`${z()}(${$}, ${U})`, () => Q.assign(K, !0).break())
            );
        }
        function L(U, F) {
          let q = W[F];
          return typeof q === "object" && q !== null
            ? Y4._`${z()}(${$}, ${U}[${F}])`
            : Y4._`${$} === ${q}`;
        }
      },
    };
  JB.default = aM;
});
var BB = P((HB) => {
  Object.defineProperty(HB, "__esModule", { value: !0 });
  var eM = gH(),
    Xj = hH(),
    Qj = pH(),
    $j = iH(),
    Yj = rH(),
    Wj = tH(),
    Jj = sH(),
    Gj = $B(),
    Hj = WB(),
    Bj = GB(),
    zj = [
      eM.default,
      Xj.default,
      Qj.default,
      $j.default,
      Yj.default,
      Wj.default,
      Jj.default,
      Gj.default,
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      Hj.default,
      Bj.default,
    ];
  HB.default = zj;
});
var yY = P((KB) => {
  Object.defineProperty(KB, "__esModule", { value: !0 });
  KB.validateAdditionalItems = void 0;
  var U6 = p(),
    xY = e(),
    Uj = {
      message: ({ params: { len: X } }) =>
        U6.str`must NOT have more than ${X} items`,
      params: ({ params: { len: X } }) => U6._`{limit: ${X}}`,
    },
    Vj = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error: Uj,
      code(X) {
        let { parentSchema: Q, it: $ } = X,
          { items: Y } = Q;
        if (!Array.isArray(Y)) {
          (0, xY.checkStrictMode)(
            $,
            '"additionalItems" is ignored when "items" is not an array of schemas'
          );
          return;
        }
        zB(X, Y);
      },
    };
  function zB(X, Q) {
    let { gen: $, schema: Y, data: W, keyword: J, it: G } = X;
    G.items = !0;
    let H = $.const("len", U6._`${W}.length`);
    if (Y === !1)
      X.setParams({ len: Q.length }), X.pass(U6._`${H} <= ${Q.length}`);
    else if (typeof Y == "object" && !(0, xY.alwaysValidSchema)(G, Y)) {
      let z = $.var("valid", U6._`${H} <= ${Q.length}`);
      $.if((0, U6.not)(z), () => B(z)), X.ok(z);
    }
    function B(z) {
      $.forRange("i", Q.length, H, (K) => {
        if (
          (X.subschema(
            { keyword: J, dataProp: K, dataPropType: xY.Type.Num },
            z
          ),
          !G.allErrors)
        )
          $.if((0, U6.not)(z), () => $.break());
      });
    }
  }
  KB.validateAdditionalItems = zB;
  KB.default = Vj;
});
var gY = P((qB) => {
  Object.defineProperty(qB, "__esModule", { value: !0 });
  qB.validateTuple = void 0;
  var VB = p(),
    i8 = e(),
    qj = d0(),
    Fj = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(X) {
        let { schema: Q, it: $ } = X;
        if (Array.isArray(Q)) return LB(X, "additionalItems", Q);
        if ((($.items = !0), (0, i8.alwaysValidSchema)($, Q))) return;
        X.ok((0, qj.validateArray)(X));
      },
    };
  function LB(X, Q, $ = X.schema) {
    let { gen: Y, parentSchema: W, data: J, keyword: G, it: H } = X;
    if ((K(W), H.opts.unevaluated && $.length && H.items !== !0))
      H.items = i8.mergeEvaluated.items(Y, $.length, H.items);
    let B = Y.name("valid"),
      z = Y.const("len", VB._`${J}.length`);
    $.forEach((V, L) => {
      if ((0, i8.alwaysValidSchema)(H, V)) return;
      Y.if(VB._`${z} > ${L}`, () =>
        X.subschema({ keyword: G, schemaProp: L, dataProp: L }, B)
      ),
        X.ok(B);
    });
    function K(V) {
      let { opts: L, errSchemaPath: U } = H,
        F = $.length,
        q = F === V.minItems && (F === V.maxItems || V[Q] === !1);
      if (L.strictTuples && !q) {
        let N = `"${G}" is ${F}-tuple, but minItems or maxItems/${Q} are not specified or different at path "${U}"`;
        (0, i8.checkStrictMode)(H, N, L.strictTuples);
      }
    }
  }
  qB.validateTuple = LB;
  qB.default = Fj;
});
var OB = P((NB) => {
  Object.defineProperty(NB, "__esModule", { value: !0 });
  var Oj = gY(),
    Dj = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (X) => (0, Oj.validateTuple)(X, "items"),
    };
  NB.default = Dj;
});
var AB = P((wB) => {
  Object.defineProperty(wB, "__esModule", { value: !0 });
  var DB = p(),
    Aj = e(),
    Mj = d0(),
    jj = yY(),
    Rj = {
      message: ({ params: { len: X } }) =>
        DB.str`must NOT have more than ${X} items`,
      params: ({ params: { len: X } }) => DB._`{limit: ${X}}`,
    },
    Ij = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error: Rj,
      code(X) {
        let { schema: Q, parentSchema: $, it: Y } = X,
          { prefixItems: W } = $;
        if (((Y.items = !0), (0, Aj.alwaysValidSchema)(Y, Q))) return;
        if (W) (0, jj.validateAdditionalItems)(X, W);
        else X.ok((0, Mj.validateArray)(X));
      },
    };
  wB.default = Ij;
});
var jB = P((MB) => {
  Object.defineProperty(MB, "__esModule", { value: !0 });
  var i0 = p(),
    n8 = e(),
    bj = {
      message: ({ params: { min: X, max: Q } }) =>
        Q === void 0
          ? i0.str`must contain at least ${X} valid item(s)`
          : i0.str`must contain at least ${X} and no more than ${Q} valid item(s)`,
      params: ({ params: { min: X, max: Q } }) =>
        Q === void 0
          ? i0._`{minContains: ${X}}`
          : i0._`{minContains: ${X}, maxContains: ${Q}}`,
    },
    Pj = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: !0,
      error: bj,
      code(X) {
        let { gen: Q, schema: $, parentSchema: Y, data: W, it: J } = X,
          G,
          H,
          { minContains: B, maxContains: z } = Y;
        if (J.opts.next) (G = B === void 0 ? 1 : B), (H = z);
        else G = 1;
        let K = Q.const("len", i0._`${W}.length`);
        if ((X.setParams({ min: G, max: H }), H === void 0 && G === 0)) {
          (0, n8.checkStrictMode)(
            J,
            '"minContains" == 0 without "maxContains": "contains" keyword ignored'
          );
          return;
        }
        if (H !== void 0 && G > H) {
          (0, n8.checkStrictMode)(
            J,
            '"minContains" > "maxContains" is always invalid'
          ),
            X.fail();
          return;
        }
        if ((0, n8.alwaysValidSchema)(J, $)) {
          let q = i0._`${K} >= ${G}`;
          if (H !== void 0) q = i0._`${q} && ${K} <= ${H}`;
          X.pass(q);
          return;
        }
        J.items = !0;
        let V = Q.name("valid");
        if (H === void 0 && G === 1) U(V, () => Q.if(V, () => Q.break()));
        else if (G === 0) {
          if ((Q.let(V, !0), H !== void 0)) Q.if(i0._`${W}.length > 0`, L);
        } else Q.let(V, !1), L();
        X.result(V, () => X.reset());
        function L() {
          let q = Q.name("_valid"),
            N = Q.let("count", 0);
          U(q, () => Q.if(q, () => F(N)));
        }
        function U(q, N) {
          Q.forRange("i", 0, K, (w) => {
            X.subschema(
              {
                keyword: "contains",
                dataProp: w,
                dataPropType: n8.Type.Num,
                compositeRule: !0,
              },
              q
            ),
              N();
          });
        }
        function F(q) {
          if ((Q.code(i0._`${q}++`), H === void 0))
            Q.if(i0._`${q} >= ${G}`, () => Q.assign(V, !0).break());
          else if (
            (Q.if(i0._`${q} > ${H}`, () => Q.assign(V, !1).break()), G === 1)
          )
            Q.assign(V, !0);
          else Q.if(i0._`${q} >= ${G}`, () => Q.assign(V, !0));
        }
      },
    };
  MB.default = Pj;
});
var SB = P((EB) => {
  Object.defineProperty(EB, "__esModule", { value: !0 });
  EB.validateSchemaDeps = EB.validatePropertyDeps = EB.error = void 0;
  var fY = p(),
    Zj = e(),
    W4 = d0();
  EB.error = {
    message: ({ params: { property: X, depsCount: Q, deps: $ } }) => {
      let Y = Q === 1 ? "property" : "properties";
      return fY.str`must have ${Y} ${$} when property ${X} is present`;
    },
    params: ({
      params: { property: X, depsCount: Q, deps: $, missingProperty: Y },
    }) => fY._`{property: ${X},
    missingProperty: ${Y},
    depsCount: ${Q},
    deps: ${$}}`,
  };
  var Cj = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: EB.error,
    code(X) {
      let [Q, $] = kj(X);
      RB(X, Q), IB(X, $);
    },
  };
  function kj({ schema: X }) {
    let Q = {},
      $ = {};
    for (let Y in X) {
      if (Y === "__proto__") continue;
      let W = Array.isArray(X[Y]) ? Q : $;
      W[Y] = X[Y];
    }
    return [Q, $];
  }
  function RB(X, Q = X.schema) {
    let { gen: $, data: Y, it: W } = X;
    if (Object.keys(Q).length === 0) return;
    let J = $.let("missing");
    for (let G in Q) {
      let H = Q[G];
      if (H.length === 0) continue;
      let B = (0, W4.propertyInData)($, Y, G, W.opts.ownProperties);
      if (
        (X.setParams({ property: G, depsCount: H.length, deps: H.join(", ") }),
        W.allErrors)
      )
        $.if(B, () => {
          for (let z of H) (0, W4.checkReportMissingProp)(X, z);
        });
      else
        $.if(fY._`${B} && (${(0, W4.checkMissingProp)(X, H, J)})`),
          (0, W4.reportMissingProp)(X, J),
          $.else();
    }
  }
  EB.validatePropertyDeps = RB;
  function IB(X, Q = X.schema) {
    let { gen: $, data: Y, keyword: W, it: J } = X,
      G = $.name("valid");
    for (let H in Q) {
      if ((0, Zj.alwaysValidSchema)(J, Q[H])) continue;
      $.if(
        (0, W4.propertyInData)($, Y, H, J.opts.ownProperties),
        () => {
          let B = X.subschema({ keyword: W, schemaProp: H }, G);
          X.mergeValidEvaluated(B, G);
        },
        () => $.var(G, !0)
      ),
        X.ok(G);
    }
  }
  EB.validateSchemaDeps = IB;
  EB.default = Cj;
});
var kB = P((CB) => {
  Object.defineProperty(CB, "__esModule", { value: !0 });
  var ZB = p(),
    _j = e(),
    xj = {
      message: "property name must be valid",
      params: ({ params: X }) => ZB._`{propertyName: ${X.propertyName}}`,
    },
    yj = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error: xj,
      code(X) {
        let { gen: Q, schema: $, data: Y, it: W } = X;
        if ((0, _j.alwaysValidSchema)(W, $)) return;
        let J = Q.name("valid");
        Q.forIn("key", Y, (G) => {
          X.setParams({ propertyName: G }),
            X.subschema(
              {
                keyword: "propertyNames",
                data: G,
                dataTypes: ["string"],
                propertyName: G,
                compositeRule: !0,
              },
              J
            ),
            Q.if((0, ZB.not)(J), () => {
              if ((X.error(!0), !W.allErrors)) Q.break();
            });
        }),
          X.ok(J);
      },
    };
  CB.default = yj;
});
var hY = P((vB) => {
  Object.defineProperty(vB, "__esModule", { value: !0 });
  var r8 = d0(),
    $1 = p(),
    fj = R1(),
    o8 = e(),
    hj = {
      message: "must NOT have additional properties",
      params: ({ params: X }) =>
        $1._`{additionalProperty: ${X.additionalProperty}}`,
    },
    uj = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: !0,
      trackErrors: !0,
      error: hj,
      code(X) {
        let {
          gen: Q,
          schema: $,
          parentSchema: Y,
          data: W,
          errsCount: J,
          it: G,
        } = X;
        if (!J) throw Error("ajv implementation error");
        let { allErrors: H, opts: B } = G;
        if (
          ((G.props = !0),
          B.removeAdditional !== "all" && (0, o8.alwaysValidSchema)(G, $))
        )
          return;
        let z = (0, r8.allSchemaProperties)(Y.properties),
          K = (0, r8.allSchemaProperties)(Y.patternProperties);
        V(), X.ok($1._`${J} === ${fj.default.errors}`);
        function V() {
          Q.forIn("key", W, (N) => {
            if (!z.length && !K.length) F(N);
            else Q.if(L(N), () => F(N));
          });
        }
        function L(N) {
          let w;
          if (z.length > 8) {
            let M = (0, o8.schemaRefOrVal)(G, Y.properties, "properties");
            w = (0, r8.isOwnProperty)(Q, M, N);
          } else if (z.length)
            w = (0, $1.or)(...z.map((M) => $1._`${N} === ${M}`));
          else w = $1.nil;
          if (K.length)
            w = (0, $1.or)(
              w,
              ...K.map((M) => $1._`${(0, r8.usePattern)(X, M)}.test(${N})`)
            );
          return (0, $1.not)(w);
        }
        function U(N) {
          Q.code($1._`delete ${W}[${N}]`);
        }
        function F(N) {
          if (
            B.removeAdditional === "all" ||
            (B.removeAdditional && $ === !1)
          ) {
            U(N);
            return;
          }
          if ($ === !1) {
            if ((X.setParams({ additionalProperty: N }), X.error(), !H))
              Q.break();
            return;
          }
          if (typeof $ == "object" && !(0, o8.alwaysValidSchema)(G, $)) {
            let w = Q.name("valid");
            if (B.removeAdditional === "failing")
              q(N, w, !1),
                Q.if((0, $1.not)(w), () => {
                  X.reset(), U(N);
                });
            else if ((q(N, w), !H)) Q.if((0, $1.not)(w), () => Q.break());
          }
        }
        function q(N, w, M) {
          let R = {
            keyword: "additionalProperties",
            dataProp: N,
            dataPropType: o8.Type.Str,
          };
          if (M === !1)
            Object.assign(R, {
              compositeRule: !0,
              createErrors: !1,
              allErrors: !1,
            });
          X.subschema(R, w);
        }
      },
    };
  vB.default = uj;
});
var yB = P((xB) => {
  Object.defineProperty(xB, "__esModule", { value: !0 });
  var mj = iX(),
    TB = d0(),
    uY = e(),
    _B = hY(),
    cj = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(X) {
        let { gen: Q, schema: $, parentSchema: Y, data: W, it: J } = X;
        if (
          J.opts.removeAdditional === "all" &&
          Y.additionalProperties === void 0
        )
          _B.default.code(
            new mj.KeywordCxt(J, _B.default, "additionalProperties")
          );
        let G = (0, TB.allSchemaProperties)($);
        for (let V of G) J.definedProperties.add(V);
        if (J.opts.unevaluated && G.length && J.props !== !0)
          J.props = uY.mergeEvaluated.props(Q, (0, uY.toHash)(G), J.props);
        let H = G.filter((V) => !(0, uY.alwaysValidSchema)(J, $[V]));
        if (H.length === 0) return;
        let B = Q.name("valid");
        for (let V of H) {
          if (z(V)) K(V);
          else {
            if (
              (Q.if((0, TB.propertyInData)(Q, W, V, J.opts.ownProperties)),
              K(V),
              !J.allErrors)
            )
              Q.else().var(B, !0);
            Q.endIf();
          }
          X.it.definedProperties.add(V), X.ok(B);
        }
        function z(V) {
          return (
            J.opts.useDefaults && !J.compositeRule && $[V].default !== void 0
          );
        }
        function K(V) {
          X.subschema({ keyword: "properties", schemaProp: V, dataProp: V }, B);
        }
      },
    };
  xB.default = cj;
});
var lB = P((uB) => {
  Object.defineProperty(uB, "__esModule", { value: !0 });
  var gB = d0(),
    t8 = p(),
    fB = e(),
    hB = e(),
    dj = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(X) {
        let { gen: Q, schema: $, data: Y, parentSchema: W, it: J } = X,
          { opts: G } = J,
          H = (0, gB.allSchemaProperties)($),
          B = H.filter((q) => (0, fB.alwaysValidSchema)(J, $[q]));
        if (
          H.length === 0 ||
          (B.length === H.length && (!J.opts.unevaluated || J.props === !0))
        )
          return;
        let z = G.strictSchema && !G.allowMatchingProperties && W.properties,
          K = Q.name("valid");
        if (J.props !== !0 && !(J.props instanceof t8.Name))
          J.props = (0, hB.evaluatedPropsToName)(Q, J.props);
        let { props: V } = J;
        L();
        function L() {
          for (let q of H) {
            if (z) U(q);
            if (J.allErrors) F(q);
            else Q.var(K, !0), F(q), Q.if(K);
          }
        }
        function U(q) {
          for (let N in z)
            if (new RegExp(q).test(N))
              (0, fB.checkStrictMode)(
                J,
                `property ${N} matches pattern ${q} (use allowMatchingProperties)`
              );
        }
        function F(q) {
          Q.forIn("key", Y, (N) => {
            Q.if(t8._`${(0, gB.usePattern)(X, q)}.test(${N})`, () => {
              let w = B.includes(q);
              if (!w)
                X.subschema(
                  {
                    keyword: "patternProperties",
                    schemaProp: q,
                    dataProp: N,
                    dataPropType: hB.Type.Str,
                  },
                  K
                );
              if (J.opts.unevaluated && V !== !0)
                Q.assign(t8._`${V}[${N}]`, !0);
              else if (!w && !J.allErrors)
                Q.if((0, t8.not)(K), () => Q.break());
            });
          });
        }
      },
    };
  uB.default = dj;
});
var cB = P((mB) => {
  Object.defineProperty(mB, "__esModule", { value: !0 });
  var nj = e(),
    rj = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: !0,
      code(X) {
        let { gen: Q, schema: $, it: Y } = X;
        if ((0, nj.alwaysValidSchema)(Y, $)) {
          X.fail();
          return;
        }
        let W = Q.name("valid");
        X.subschema(
          {
            keyword: "not",
            compositeRule: !0,
            createErrors: !1,
            allErrors: !1,
          },
          W
        ),
          X.failResult(
            W,
            () => X.reset(),
            () => X.error()
          );
      },
      error: { message: "must NOT be valid" },
    };
  mB.default = rj;
});
var dB = P((pB) => {
  Object.defineProperty(pB, "__esModule", { value: !0 });
  var tj = d0(),
    aj = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: !0,
      code: tj.validateUnion,
      error: { message: "must match a schema in anyOf" },
    };
  pB.default = aj;
});
var nB = P((iB) => {
  Object.defineProperty(iB, "__esModule", { value: !0 });
  var a8 = p(),
    ej = e(),
    XR = {
      message: "must match exactly one schema in oneOf",
      params: ({ params: X }) => a8._`{passingSchemas: ${X.passing}}`,
    },
    QR = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: !0,
      error: XR,
      code(X) {
        let { gen: Q, schema: $, parentSchema: Y, it: W } = X;
        if (!Array.isArray($)) throw Error("ajv implementation error");
        if (W.opts.discriminator && Y.discriminator) return;
        let J = $,
          G = Q.let("valid", !1),
          H = Q.let("passing", null),
          B = Q.name("_valid");
        X.setParams({ passing: H }),
          Q.block(z),
          X.result(
            G,
            () => X.reset(),
            () => X.error(!0)
          );
        function z() {
          J.forEach((K, V) => {
            let L;
            if ((0, ej.alwaysValidSchema)(W, K)) Q.var(B, !0);
            else
              L = X.subschema(
                { keyword: "oneOf", schemaProp: V, compositeRule: !0 },
                B
              );
            if (V > 0)
              Q.if(a8._`${B} && ${G}`)
                .assign(G, !1)
                .assign(H, a8._`[${H}, ${V}]`)
                .else();
            Q.if(B, () => {
              if ((Q.assign(G, !0), Q.assign(H, V), L))
                X.mergeEvaluated(L, a8.Name);
            });
          });
        }
      },
    };
  iB.default = QR;
});
var oB = P((rB) => {
  Object.defineProperty(rB, "__esModule", { value: !0 });
  var YR = e(),
    WR = {
      keyword: "allOf",
      schemaType: "array",
      code(X) {
        let { gen: Q, schema: $, it: Y } = X;
        if (!Array.isArray($)) throw Error("ajv implementation error");
        let W = Q.name("valid");
        $.forEach((J, G) => {
          if ((0, YR.alwaysValidSchema)(Y, J)) return;
          let H = X.subschema({ keyword: "allOf", schemaProp: G }, W);
          X.ok(W), X.mergeEvaluated(H);
        });
      },
    };
  rB.default = WR;
});
var eB = P((sB) => {
  Object.defineProperty(sB, "__esModule", { value: !0 });
  var s8 = p(),
    aB = e(),
    GR = {
      message: ({ params: X }) => s8.str`must match "${X.ifClause}" schema`,
      params: ({ params: X }) => s8._`{failingKeyword: ${X.ifClause}}`,
    },
    HR = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: !0,
      error: GR,
      code(X) {
        let { gen: Q, parentSchema: $, it: Y } = X;
        if ($.then === void 0 && $.else === void 0)
          (0, aB.checkStrictMode)(
            Y,
            '"if" without "then" and "else" is ignored'
          );
        let W = tB(Y, "then"),
          J = tB(Y, "else");
        if (!W && !J) return;
        let G = Q.let("valid", !0),
          H = Q.name("_valid");
        if ((B(), X.reset(), W && J)) {
          let K = Q.let("ifClause");
          X.setParams({ ifClause: K }), Q.if(H, z("then", K), z("else", K));
        } else if (W) Q.if(H, z("then"));
        else Q.if((0, s8.not)(H), z("else"));
        X.pass(G, () => X.error(!0));
        function B() {
          let K = X.subschema(
            {
              keyword: "if",
              compositeRule: !0,
              createErrors: !1,
              allErrors: !1,
            },
            H
          );
          X.mergeEvaluated(K);
        }
        function z(K, V) {
          return () => {
            let L = X.subschema({ keyword: K }, H);
            if ((Q.assign(G, H), X.mergeValidEvaluated(L, G), V))
              Q.assign(V, s8._`${K}`);
            else X.setParams({ ifClause: K });
          };
        }
      },
    };
  function tB(X, Q) {
    let $ = X.schema[Q];
    return $ !== void 0 && !(0, aB.alwaysValidSchema)(X, $);
  }
  sB.default = HR;
});
var Qz = P((Xz) => {
  Object.defineProperty(Xz, "__esModule", { value: !0 });
  var zR = e(),
    KR = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword: X, parentSchema: Q, it: $ }) {
        if (Q.if === void 0)
          (0, zR.checkStrictMode)($, `"${X}" without "if" is ignored`);
      },
    };
  Xz.default = KR;
});
var Yz = P(($z) => {
  Object.defineProperty($z, "__esModule", { value: !0 });
  var VR = yY(),
    LR = OB(),
    qR = gY(),
    FR = AB(),
    NR = jB(),
    OR = SB(),
    DR = kB(),
    wR = hY(),
    AR = yB(),
    MR = lB(),
    jR = cB(),
    RR = dB(),
    IR = nB(),
    ER = oB(),
    bR = eB(),
    PR = Qz();
  function SR(X = !1) {
    let Q = [
      jR.default,
      RR.default,
      IR.default,
      ER.default,
      bR.default,
      PR.default,
      DR.default,
      wR.default,
      OR.default,
      AR.default,
      MR.default,
    ];
    if (X) Q.push(LR.default, FR.default);
    else Q.push(VR.default, qR.default);
    return Q.push(NR.default), Q;
  }
  $z.default = SR;
});
var Jz = P((Wz) => {
  Object.defineProperty(Wz, "__esModule", { value: !0 });
  var L0 = p(),
    CR = {
      message: ({ schemaCode: X }) => L0.str`must match format "${X}"`,
      params: ({ schemaCode: X }) => L0._`{format: ${X}}`,
    },
    kR = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: !0,
      error: CR,
      code(X, Q) {
        let { gen: $, data: Y, $data: W, schema: J, schemaCode: G, it: H } = X,
          { opts: B, errSchemaPath: z, schemaEnv: K, self: V } = H;
        if (!B.validateFormats) return;
        if (W) L();
        else U();
        function L() {
          let F = $.scopeValue("formats", {
              ref: V.formats,
              code: B.code.formats,
            }),
            q = $.const("fDef", L0._`${F}[${G}]`),
            N = $.let("fType"),
            w = $.let("format");
          $.if(
            L0._`typeof ${q} == "object" && !(${q} instanceof RegExp)`,
            () =>
              $.assign(N, L0._`${q}.type || "string"`).assign(
                w,
                L0._`${q}.validate`
              ),
            () => $.assign(N, L0._`"string"`).assign(w, q)
          ),
            X.fail$data((0, L0.or)(M(), R()));
          function M() {
            if (B.strictSchema === !1) return L0.nil;
            return L0._`${G} && !${w}`;
          }
          function R() {
            let S = K.$async
                ? L0._`(${q}.async ? await ${w}(${Y}) : ${w}(${Y}))`
                : L0._`${w}(${Y})`,
              C = L0._`(typeof ${w} == "function" ? ${S} : ${w}.test(${Y}))`;
            return L0._`${w} && ${w} !== true && ${N} === ${Q} && !${C}`;
          }
        }
        function U() {
          let F = V.formats[J];
          if (!F) {
            M();
            return;
          }
          if (F === !0) return;
          let [q, N, w] = R(F);
          if (q === Q) X.pass(S());
          function M() {
            if (B.strictSchema === !1) {
              V.logger.warn(C());
              return;
            }
            throw Error(C());
            function C() {
              return `unknown format "${J}" ignored in schema at path "${z}"`;
            }
          }
          function R(C) {
            let K0 =
                C instanceof RegExp
                  ? (0, L0.regexpCode)(C)
                  : B.code.formats
                  ? L0._`${B.code.formats}${(0, L0.getProperty)(J)}`
                  : void 0,
              U0 = $.scopeValue("formats", { key: J, ref: C, code: K0 });
            if (typeof C == "object" && !(C instanceof RegExp))
              return [C.type || "string", C.validate, L0._`${U0}.validate`];
            return ["string", C, U0];
          }
          function S() {
            if (typeof F == "object" && !(F instanceof RegExp) && F.async) {
              if (!K.$async) throw Error("async format in sync schema");
              return L0._`await ${w}(${Y})`;
            }
            return typeof N == "function"
              ? L0._`${w}(${Y})`
              : L0._`${w}.test(${Y})`;
          }
        }
      },
    };
  Wz.default = kR;
});
var Hz = P((Gz) => {
  Object.defineProperty(Gz, "__esModule", { value: !0 });
  var TR = Jz(),
    _R = [TR.default];
  Gz.default = _R;
});
var Kz = P((Bz) => {
  Object.defineProperty(Bz, "__esModule", { value: !0 });
  Bz.contentVocabulary = Bz.metadataVocabulary = void 0;
  Bz.metadataVocabulary = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples",
  ];
  Bz.contentVocabulary = [
    "contentMediaType",
    "contentEncoding",
    "contentSchema",
  ];
});
var Lz = P((Vz) => {
  Object.defineProperty(Vz, "__esModule", { value: !0 });
  var gR = xH(),
    fR = BB(),
    hR = Yz(),
    uR = Hz(),
    Uz = Kz(),
    lR = [
      gR.default,
      fR.default,
      (0, hR.default)(),
      uR.default,
      Uz.metadataVocabulary,
      Uz.contentVocabulary,
    ];
  Vz.default = lR;
});
var Oz = P((Fz) => {
  Object.defineProperty(Fz, "__esModule", { value: !0 });
  Fz.DiscrError = void 0;
  var qz;
  (function (X) {
    (X.Tag = "tag"), (X.Mapping = "mapping");
  })(qz || (Fz.DiscrError = qz = {}));
});
var Az = P((wz) => {
  Object.defineProperty(wz, "__esModule", { value: !0 });
  var d6 = p(),
    lY = Oz(),
    Dz = _8(),
    cR = nX(),
    pR = e(),
    dR = {
      message: ({ params: { discrError: X, tagName: Q } }) =>
        X === lY.DiscrError.Tag
          ? `tag "${Q}" must be string`
          : `value of tag "${Q}" must be in oneOf`,
      params: ({ params: { discrError: X, tag: Q, tagName: $ } }) =>
        d6._`{error: ${X}, tag: ${$}, tagValue: ${Q}}`,
    },
    iR = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error: dR,
      code(X) {
        let { gen: Q, data: $, schema: Y, parentSchema: W, it: J } = X,
          { oneOf: G } = W;
        if (!J.opts.discriminator)
          throw Error("discriminator: requires discriminator option");
        let H = Y.propertyName;
        if (typeof H != "string")
          throw Error("discriminator: requires propertyName");
        if (Y.mapping) throw Error("discriminator: mapping is not supported");
        if (!G) throw Error("discriminator: requires oneOf keyword");
        let B = Q.let("valid", !1),
          z = Q.const("tag", d6._`${$}${(0, d6.getProperty)(H)}`);
        Q.if(
          d6._`typeof ${z} == "string"`,
          () => K(),
          () =>
            X.error(!1, { discrError: lY.DiscrError.Tag, tag: z, tagName: H })
        ),
          X.ok(B);
        function K() {
          let U = L();
          Q.if(!1);
          for (let F in U) Q.elseIf(d6._`${z} === ${F}`), Q.assign(B, V(U[F]));
          Q.else(),
            X.error(!1, {
              discrError: lY.DiscrError.Mapping,
              tag: z,
              tagName: H,
            }),
            Q.endIf();
        }
        function V(U) {
          let F = Q.name("valid"),
            q = X.subschema({ keyword: "oneOf", schemaProp: U }, F);
          return X.mergeEvaluated(q, d6.Name), F;
        }
        function L() {
          var U;
          let F = {},
            q = w(W),
            N = !0;
          for (let S = 0; S < G.length; S++) {
            let C = G[S];
            if (
              (C === null || C === void 0 ? void 0 : C.$ref) &&
              !(0, pR.schemaHasRulesButRef)(C, J.self.RULES)
            ) {
              let U0 = C.$ref;
              if (
                ((C = Dz.resolveRef.call(
                  J.self,
                  J.schemaEnv.root,
                  J.baseId,
                  U0
                )),
                C instanceof Dz.SchemaEnv)
              )
                C = C.schema;
              if (C === void 0)
                throw new cR.default(J.opts.uriResolver, J.baseId, U0);
            }
            let K0 =
              (U = C === null || C === void 0 ? void 0 : C.properties) ===
                null || U === void 0
                ? void 0
                : U[H];
            if (typeof K0 != "object")
              throw Error(
                `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${H}"`
              );
            (N = N && (q || w(C))), M(K0, S);
          }
          if (!N) throw Error(`discriminator: "${H}" must be required`);
          return F;
          function w({ required: S }) {
            return Array.isArray(S) && S.includes(H);
          }
          function M(S, C) {
            if (S.const) R(S.const, C);
            else if (S.enum) for (let K0 of S.enum) R(K0, C);
            else
              throw Error(
                `discriminator: "properties/${H}" must have "const" or "enum"`
              );
          }
          function R(S, C) {
            if (typeof S != "string" || S in F)
              throw Error(
                `discriminator: "${H}" values must be unique strings`
              );
            F[S] = C;
          }
        }
      },
    };
  wz.default = iR;
});
var Mz = P((H_, rR) => {
  rR.exports = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "http://json-schema.org/draft-07/schema#",
    title: "Core schema meta-schema",
    definitions: {
      schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } },
      nonNegativeInteger: { type: "integer", minimum: 0 },
      nonNegativeIntegerDefault0: {
        allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }],
      },
      simpleTypes: {
        enum: [
          "array",
          "boolean",
          "integer",
          "null",
          "number",
          "object",
          "string",
        ],
      },
      stringArray: {
        type: "array",
        items: { type: "string" },
        uniqueItems: !0,
        default: [],
      },
    },
    type: ["object", "boolean"],
    properties: {
      $id: { type: "string", format: "uri-reference" },
      $schema: { type: "string", format: "uri" },
      $ref: { type: "string", format: "uri-reference" },
      $comment: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      default: !0,
      readOnly: { type: "boolean", default: !1 },
      examples: { type: "array", items: !0 },
      multipleOf: { type: "number", exclusiveMinimum: 0 },
      maximum: { type: "number" },
      exclusiveMaximum: { type: "number" },
      minimum: { type: "number" },
      exclusiveMinimum: { type: "number" },
      maxLength: { $ref: "#/definitions/nonNegativeInteger" },
      minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
      pattern: { type: "string", format: "regex" },
      additionalItems: { $ref: "#" },
      items: {
        anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
        default: !0,
      },
      maxItems: { $ref: "#/definitions/nonNegativeInteger" },
      minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
      uniqueItems: { type: "boolean", default: !1 },
      contains: { $ref: "#" },
      maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
      minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
      required: { $ref: "#/definitions/stringArray" },
      additionalProperties: { $ref: "#" },
      definitions: {
        type: "object",
        additionalProperties: { $ref: "#" },
        default: {},
      },
      properties: {
        type: "object",
        additionalProperties: { $ref: "#" },
        default: {},
      },
      patternProperties: {
        type: "object",
        additionalProperties: { $ref: "#" },
        propertyNames: { format: "regex" },
        default: {},
      },
      dependencies: {
        type: "object",
        additionalProperties: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }],
        },
      },
      propertyNames: { $ref: "#" },
      const: !0,
      enum: { type: "array", items: !0, minItems: 1, uniqueItems: !0 },
      type: {
        anyOf: [
          { $ref: "#/definitions/simpleTypes" },
          {
            type: "array",
            items: { $ref: "#/definitions/simpleTypes" },
            minItems: 1,
            uniqueItems: !0,
          },
        ],
      },
      format: { type: "string" },
      contentMediaType: { type: "string" },
      contentEncoding: { type: "string" },
      if: { $ref: "#" },
      then: { $ref: "#" },
      else: { $ref: "#" },
      allOf: { $ref: "#/definitions/schemaArray" },
      anyOf: { $ref: "#/definitions/schemaArray" },
      oneOf: { $ref: "#/definitions/schemaArray" },
      not: { $ref: "#" },
    },
    default: !0,
  };
});
var cY = P((f0, mY) => {
  Object.defineProperty(f0, "__esModule", { value: !0 });
  f0.MissingRefError =
    f0.ValidationError =
    f0.CodeGen =
    f0.Name =
    f0.nil =
    f0.stringify =
    f0.str =
    f0._ =
    f0.KeywordCxt =
    f0.Ajv =
      void 0;
  var oR = EH(),
    tR = Lz(),
    aR = Az(),
    jz = Mz(),
    sR = ["/properties"],
    e8 = "http://json-schema.org/draft-07/schema";
  class J4 extends oR.default {
    _addVocabularies() {
      if (
        (super._addVocabularies(),
        tR.default.forEach((X) => this.addVocabulary(X)),
        this.opts.discriminator)
      )
        this.addKeyword(aR.default);
    }
    _addDefaultMetaSchema() {
      if ((super._addDefaultMetaSchema(), !this.opts.meta)) return;
      let X = this.opts.$data ? this.$dataMetaSchema(jz, sR) : jz;
      this.addMetaSchema(X, e8, !1),
        (this.refs["http://json-schema.org/schema"] = e8);
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(e8) ? e8 : void 0));
    }
  }
  f0.Ajv = J4;
  mY.exports = f0 = J4;
  mY.exports.Ajv = J4;
  Object.defineProperty(f0, "__esModule", { value: !0 });
  f0.default = J4;
  var eR = iX();
  Object.defineProperty(f0, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return eR.KeywordCxt;
    },
  });
  var i6 = p();
  Object.defineProperty(f0, "_", {
    enumerable: !0,
    get: function () {
      return i6._;
    },
  });
  Object.defineProperty(f0, "str", {
    enumerable: !0,
    get: function () {
      return i6.str;
    },
  });
  Object.defineProperty(f0, "stringify", {
    enumerable: !0,
    get: function () {
      return i6.stringify;
    },
  });
  Object.defineProperty(f0, "nil", {
    enumerable: !0,
    get: function () {
      return i6.nil;
    },
  });
  Object.defineProperty(f0, "Name", {
    enumerable: !0,
    get: function () {
      return i6.Name;
    },
  });
  Object.defineProperty(f0, "CodeGen", {
    enumerable: !0,
    get: function () {
      return i6.CodeGen;
    },
  });
  var XI = v8();
  Object.defineProperty(f0, "ValidationError", {
    enumerable: !0,
    get: function () {
      return XI.default;
    },
  });
  var QI = nX();
  Object.defineProperty(f0, "MissingRefError", {
    enumerable: !0,
    get: function () {
      return QI.default;
    },
  });
});
var vz = P((Cz) => {
  Object.defineProperty(Cz, "__esModule", { value: !0 });
  Cz.formatNames = Cz.fastFormats = Cz.fullFormats = void 0;
  function V1(X, Q) {
    return { validate: X, compare: Q };
  }
  Cz.fullFormats = {
    date: V1(bz, nY),
    time: V1(dY(!0), rY),
    "date-time": V1(Rz(!0), Sz),
    "iso-time": V1(dY(), Pz),
    "iso-date-time": V1(Rz(), Zz),
    duration:
      /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: zI,
    "uri-reference":
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    "uri-template":
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email:
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname:
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex: NI,
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment":
      /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    byte: KI,
    int32: { type: "number", validate: LI },
    int64: { type: "number", validate: qI },
    float: { type: "number", validate: Ez },
    double: { type: "number", validate: Ez },
    password: !0,
    binary: !0,
  };
  Cz.fastFormats = {
    ...Cz.fullFormats,
    date: V1(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, nY),
    time: V1(
      /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
      rY
    ),
    "date-time": V1(
      /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
      Sz
    ),
    "iso-time": V1(
      /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      Pz
    ),
    "iso-date-time": V1(
      /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      Zz
    ),
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference":
      /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    email:
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  };
  Cz.formatNames = Object.keys(Cz.fullFormats);
  function WI(X) {
    return X % 4 === 0 && (X % 100 !== 0 || X % 400 === 0);
  }
  var JI = /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
    GI = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function bz(X) {
    let Q = JI.exec(X);
    if (!Q) return !1;
    let $ = +Q[1],
      Y = +Q[2],
      W = +Q[3];
    return Y >= 1 && Y <= 12 && W >= 1 && W <= (Y === 2 && WI($) ? 29 : GI[Y]);
  }
  function nY(X, Q) {
    if (!(X && Q)) return;
    if (X > Q) return 1;
    if (X < Q) return -1;
    return 0;
  }
  var pY = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function dY(X) {
    return function ($) {
      let Y = pY.exec($);
      if (!Y) return !1;
      let W = +Y[1],
        J = +Y[2],
        G = +Y[3],
        H = Y[4],
        B = Y[5] === "-" ? -1 : 1,
        z = +(Y[6] || 0),
        K = +(Y[7] || 0);
      if (z > 23 || K > 59 || (X && !H)) return !1;
      if (W <= 23 && J <= 59 && G < 60) return !0;
      let V = J - K * B,
        L = W - z * B - (V < 0 ? 1 : 0);
      return (L === 23 || L === -1) && (V === 59 || V === -1) && G < 61;
    };
  }
  function rY(X, Q) {
    if (!(X && Q)) return;
    let $ = new Date("2020-01-01T" + X).valueOf(),
      Y = new Date("2020-01-01T" + Q).valueOf();
    if (!($ && Y)) return;
    return $ - Y;
  }
  function Pz(X, Q) {
    if (!(X && Q)) return;
    let $ = pY.exec(X),
      Y = pY.exec(Q);
    if (!($ && Y)) return;
    if (((X = $[1] + $[2] + $[3]), (Q = Y[1] + Y[2] + Y[3]), X > Q)) return 1;
    if (X < Q) return -1;
    return 0;
  }
  var iY = /t|\s/i;
  function Rz(X) {
    let Q = dY(X);
    return function (Y) {
      let W = Y.split(iY);
      return W.length === 2 && bz(W[0]) && Q(W[1]);
    };
  }
  function Sz(X, Q) {
    if (!(X && Q)) return;
    let $ = new Date(X).valueOf(),
      Y = new Date(Q).valueOf();
    if (!($ && Y)) return;
    return $ - Y;
  }
  function Zz(X, Q) {
    if (!(X && Q)) return;
    let [$, Y] = X.split(iY),
      [W, J] = Q.split(iY),
      G = nY($, W);
    if (G === void 0) return;
    return G || rY(Y, J);
  }
  var HI = /\/|:/,
    BI =
      /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function zI(X) {
    return HI.test(X) && BI.test(X);
  }
  var Iz = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function KI(X) {
    return (Iz.lastIndex = 0), Iz.test(X);
  }
  var UI = -2147483648,
    VI = 2147483647;
  function LI(X) {
    return Number.isInteger(X) && X <= VI && X >= UI;
  }
  function qI(X) {
    return Number.isInteger(X);
  }
  function Ez() {
    return !0;
  }
  var FI = /[^\\]\\Z/;
  function NI(X) {
    if (FI.test(X)) return !1;
    try {
      return new RegExp(X), !0;
    } catch (Q) {
      return !1;
    }
  }
});
var _z = P((Tz) => {
  Object.defineProperty(Tz, "__esModule", { value: !0 });
  Tz.formatLimitDefinition = void 0;
  var DI = cY(),
    Y1 = p(),
    n1 = Y1.operators,
    X9 = {
      formatMaximum: { okStr: "<=", ok: n1.LTE, fail: n1.GT },
      formatMinimum: { okStr: ">=", ok: n1.GTE, fail: n1.LT },
      formatExclusiveMaximum: { okStr: "<", ok: n1.LT, fail: n1.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: n1.GT, fail: n1.LTE },
    },
    wI = {
      message: ({ keyword: X, schemaCode: Q }) =>
        Y1.str`should be ${X9[X].okStr} ${Q}`,
      params: ({ keyword: X, schemaCode: Q }) =>
        Y1._`{comparison: ${X9[X].okStr}, limit: ${Q}}`,
    };
  Tz.formatLimitDefinition = {
    keyword: Object.keys(X9),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: wI,
    code(X) {
      let { gen: Q, data: $, schemaCode: Y, keyword: W, it: J } = X,
        { opts: G, self: H } = J;
      if (!G.validateFormats) return;
      let B = new DI.KeywordCxt(J, H.RULES.all.format.definition, "format");
      if (B.$data) z();
      else K();
      function z() {
        let L = Q.scopeValue("formats", {
            ref: H.formats,
            code: G.code.formats,
          }),
          U = Q.const("fmt", Y1._`${L}[${B.schemaCode}]`);
        X.fail$data(
          (0, Y1.or)(
            Y1._`typeof ${U} != "object"`,
            Y1._`${U} instanceof RegExp`,
            Y1._`typeof ${U}.compare != "function"`,
            V(U)
          )
        );
      }
      function K() {
        let L = B.schema,
          U = H.formats[L];
        if (!U || U === !0) return;
        if (
          typeof U != "object" ||
          U instanceof RegExp ||
          typeof U.compare != "function"
        )
          throw Error(
            `"${W}": format "${L}" does not define "compare" function`
          );
        let F = Q.scopeValue("formats", {
          key: L,
          ref: U,
          code: G.code.formats
            ? Y1._`${G.code.formats}${(0, Y1.getProperty)(L)}`
            : void 0,
        });
        X.fail$data(V(F));
      }
      function V(L) {
        return Y1._`${L}.compare(${$}, ${Y}) ${X9[W].fail} 0`;
      }
    },
    dependencies: ["format"],
  };
  var AI = (X) => {
    return X.addKeyword(Tz.formatLimitDefinition), X;
  };
  Tz.default = AI;
});
var fz = P((G4, gz) => {
  Object.defineProperty(G4, "__esModule", { value: !0 });
  var n6 = vz(),
    jI = _z(),
    aY = p(),
    xz = new aY.Name("fullFormats"),
    RI = new aY.Name("fastFormats"),
    sY = (X, Q = { keywords: !0 }) => {
      if (Array.isArray(Q)) return yz(X, Q, n6.fullFormats, xz), X;
      let [$, Y] =
          Q.mode === "fast" ? [n6.fastFormats, RI] : [n6.fullFormats, xz],
        W = Q.formats || n6.formatNames;
      if ((yz(X, W, $, Y), Q.keywords)) (0, jI.default)(X);
      return X;
    };
  sY.get = (X, Q = "full") => {
    let Y = (Q === "fast" ? n6.fastFormats : n6.fullFormats)[X];
    if (!Y) throw Error(`Unknown format "${X}"`);
    return Y;
  };
  function yz(X, Q, $, Y) {
    var W, J;
    ((W = (J = X.opts.code).formats) !== null && W !== void 0) ||
      (J.formats = aY._`require("ajv-formats/dist/formats").${Y}`);
    for (let G of Q) X.addFormat(G, $[G]);
  }
  gz.exports = G4 = sY;
  Object.defineProperty(G4, "__esModule", { value: !0 });
  G4.default = sY;
});
import { join as tz } from "path";
import { fileURLToPath as TI } from "url";
import { setMaxListeners as UK } from "events";
var VK = 50;
function F6(X = VK) {
  let Q = new AbortController();
  return UK(X, Q.signal), Q;
}
import { spawn as XV } from "child_process";
import { createInterface as QV } from "readline";
import * as h from "fs";
import {
  stat as hU,
  readdir as uU,
  unlink as lU,
  rmdir as mU,
  rm as cU,
  open as zP,
} from "fs/promises";
var LK =
    typeof global == "object" && global && global.Object === Object && global,
  q7 = LK;
var qK = typeof self == "object" && self && self.Object === Object && self,
  FK = q7 || qK || Function("return this")(),
  N6 = FK;
var NK = N6.Symbol,
  O6 = NK;
var F7 = Object.prototype,
  OK = F7.hasOwnProperty,
  DK = F7.toString,
  e6 = O6 ? O6.toStringTag : void 0;
function wK(X) {
  var Q = OK.call(X, e6),
    $ = X[e6];
  try {
    X[e6] = void 0;
    var Y = !0;
  } catch (J) {}
  var W = DK.call(X);
  if (Y)
    if (Q) X[e6] = $;
    else delete X[e6];
  return W;
}
var N7 = wK;
var AK = Object.prototype,
  MK = AK.toString;
function jK(X) {
  return MK.call(X);
}
var O7 = jK;
var RK = "[object Null]",
  IK = "[object Undefined]",
  D7 = O6 ? O6.toStringTag : void 0;
function EK(X) {
  if (X == null) return X === void 0 ? IK : RK;
  return D7 && D7 in Object(X) ? N7(X) : O7(X);
}
var w7 = EK;
function bK(X) {
  var Q = typeof X;
  return X != null && (Q == "object" || Q == "function");
}
var z4 = bK;
var PK = "[object AsyncFunction]",
  SK = "[object Function]",
  ZK = "[object GeneratorFunction]",
  CK = "[object Proxy]";
function kK(X) {
  if (!z4(X)) return !1;
  var Q = w7(X);
  return Q == SK || Q == ZK || Q == PK || Q == CK;
}
var A7 = kK;
var vK = N6["__core-js_shared__"],
  K4 = vK;
var M7 = (function () {
  var X = /[^.]+$/.exec((K4 && K4.keys && K4.keys.IE_PROTO) || "");
  return X ? "Symbol(src)_1." + X : "";
})();
function TK(X) {
  return !!M7 && M7 in X;
}
var j7 = TK;
var _K = Function.prototype,
  xK = _K.toString;
function yK(X) {
  if (X != null) {
    try {
      return xK.call(X);
    } catch (Q) {}
    try {
      return X + "";
    } catch (Q) {}
  }
  return "";
}
var R7 = yK;
var gK = /[\\^$.*+?()[\]{}|]/g,
  fK = /^\[object .+?Constructor\]$/,
  hK = Function.prototype,
  uK = Object.prototype,
  lK = hK.toString,
  mK = uK.hasOwnProperty,
  cK = RegExp(
    "^" +
      lK
        .call(mK)
        .replace(gK, "\\$&")
        .replace(
          /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
          "$1.*?"
        ) +
      "$"
  );
function pK(X) {
  if (!z4(X) || j7(X)) return !1;
  var Q = A7(X) ? cK : fK;
  return Q.test(R7(X));
}
var I7 = pK;
function dK(X, Q) {
  return X == null ? void 0 : X[Q];
}
var E7 = dK;
function iK(X, Q) {
  var $ = E7(X, Q);
  return I7($) ? $ : void 0;
}
var U4 = iK;
var nK = U4(Object, "create"),
  q1 = nK;
function rK() {
  (this.__data__ = q1 ? q1(null) : {}), (this.size = 0);
}
var b7 = rK;
function oK(X) {
  var Q = this.has(X) && delete this.__data__[X];
  return (this.size -= Q ? 1 : 0), Q;
}
var P7 = oK;
var tK = "__lodash_hash_undefined__",
  aK = Object.prototype,
  sK = aK.hasOwnProperty;
function eK(X) {
  var Q = this.__data__;
  if (q1) {
    var $ = Q[X];
    return $ === tK ? void 0 : $;
  }
  return sK.call(Q, X) ? Q[X] : void 0;
}
var S7 = eK;
var XU = Object.prototype,
  QU = XU.hasOwnProperty;
function $U(X) {
  var Q = this.__data__;
  return q1 ? Q[X] !== void 0 : QU.call(Q, X);
}
var Z7 = $U;
var YU = "__lodash_hash_undefined__";
function WU(X, Q) {
  var $ = this.__data__;
  return (
    (this.size += this.has(X) ? 0 : 1),
    ($[X] = q1 && Q === void 0 ? YU : Q),
    this
  );
}
var C7 = WU;
function D6(X) {
  var Q = -1,
    $ = X == null ? 0 : X.length;
  this.clear();
  while (++Q < $) {
    var Y = X[Q];
    this.set(Y[0], Y[1]);
  }
}
D6.prototype.clear = b7;
D6.prototype.delete = P7;
D6.prototype.get = S7;
D6.prototype.has = Z7;
D6.prototype.set = C7;
var W9 = D6;
function JU() {
  (this.__data__ = []), (this.size = 0);
}
var k7 = JU;
function GU(X, Q) {
  return X === Q || (X !== X && Q !== Q);
}
var v7 = GU;
function HU(X, Q) {
  var $ = X.length;
  while ($--) if (v7(X[$][0], Q)) return $;
  return -1;
}
var Z1 = HU;
var BU = Array.prototype,
  zU = BU.splice;
function KU(X) {
  var Q = this.__data__,
    $ = Z1(Q, X);
  if ($ < 0) return !1;
  var Y = Q.length - 1;
  if ($ == Y) Q.pop();
  else zU.call(Q, $, 1);
  return --this.size, !0;
}
var T7 = KU;
function UU(X) {
  var Q = this.__data__,
    $ = Z1(Q, X);
  return $ < 0 ? void 0 : Q[$][1];
}
var _7 = UU;
function VU(X) {
  return Z1(this.__data__, X) > -1;
}
var x7 = VU;
function LU(X, Q) {
  var $ = this.__data__,
    Y = Z1($, X);
  if (Y < 0) ++this.size, $.push([X, Q]);
  else $[Y][1] = Q;
  return this;
}
var y7 = LU;
function w6(X) {
  var Q = -1,
    $ = X == null ? 0 : X.length;
  this.clear();
  while (++Q < $) {
    var Y = X[Q];
    this.set(Y[0], Y[1]);
  }
}
w6.prototype.clear = k7;
w6.prototype.delete = T7;
w6.prototype.get = _7;
w6.prototype.has = x7;
w6.prototype.set = y7;
var g7 = w6;
var qU = U4(N6, "Map"),
  f7 = qU;
function FU() {
  (this.size = 0),
    (this.__data__ = {
      hash: new W9(),
      map: new (f7 || g7)(),
      string: new W9(),
    });
}
var h7 = FU;
function NU(X) {
  var Q = typeof X;
  return Q == "string" || Q == "number" || Q == "symbol" || Q == "boolean"
    ? X !== "__proto__"
    : X === null;
}
var u7 = NU;
function OU(X, Q) {
  var $ = X.__data__;
  return u7(Q) ? $[typeof Q == "string" ? "string" : "hash"] : $.map;
}
var C1 = OU;
function DU(X) {
  var Q = C1(this, X).delete(X);
  return (this.size -= Q ? 1 : 0), Q;
}
var l7 = DU;
function wU(X) {
  return C1(this, X).get(X);
}
var m7 = wU;
function AU(X) {
  return C1(this, X).has(X);
}
var c7 = AU;
function MU(X, Q) {
  var $ = C1(this, X),
    Y = $.size;
  return $.set(X, Q), (this.size += $.size == Y ? 0 : 1), this;
}
var p7 = MU;
function A6(X) {
  var Q = -1,
    $ = X == null ? 0 : X.length;
  this.clear();
  while (++Q < $) {
    var Y = X[Q];
    this.set(Y[0], Y[1]);
  }
}
A6.prototype.clear = h7;
A6.prototype.delete = l7;
A6.prototype.get = m7;
A6.prototype.has = c7;
A6.prototype.set = p7;
var J9 = A6;
var jU = "Expected a function";
function G9(X, Q) {
  if (typeof X != "function" || (Q != null && typeof Q != "function"))
    throw TypeError(jU);
  var $ = function () {
    var Y = arguments,
      W = Q ? Q.apply(this, Y) : Y[0],
      J = $.cache;
    if (J.has(W)) return J.get(W);
    var G = X.apply(this, Y);
    return ($.cache = J.set(W, G) || J), G;
  };
  return ($.cache = new (G9.Cache || J9)()), $;
}
G9.Cache = J9;
var k1 = G9;
function RU(X, Q) {
  if (X.destroyed) return;
  X.write(Q);
}
function d7(X) {
  RU(process.stderr, X);
}
var i7 = k1((X) => {
  if (!X || X.trim() === "") return null;
  let Q = X.split(",")
    .map((J) => J.trim())
    .filter(Boolean);
  if (Q.length === 0) return null;
  let $ = Q.some((J) => J.startsWith("!")),
    Y = Q.some((J) => !J.startsWith("!"));
  if ($ && Y) return null;
  let W = Q.map((J) => J.replace(/^!/, "").toLowerCase());
  return { include: $ ? [] : W, exclude: $ ? W : [], isExclusive: $ };
});
function IU(X) {
  let Q = [],
    $ = X.match(/^MCP server ["']([^"']+)["']/);
  if ($ && $[1]) Q.push("mcp"), Q.push($[1].toLowerCase());
  else {
    let J = X.match(/^([^:[]+):/);
    if (J && J[1]) Q.push(J[1].trim().toLowerCase());
  }
  let Y = X.match(/^\[([^\]]+)]/);
  if (Y && Y[1]) Q.push(Y[1].trim().toLowerCase());
  if (X.toLowerCase().includes("1p event:")) Q.push("1p");
  let W = X.match(/:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/);
  if (W && W[1]) {
    let J = W[1].trim().toLowerCase();
    if (J.length < 30 && !J.includes(" ")) Q.push(J);
  }
  return Array.from(new Set(Q));
}
function EU(X, Q) {
  if (!Q) return !0;
  if (X.length === 0) return !1;
  if (Q.isExclusive) return !X.some(($) => Q.exclude.includes($));
  else return X.some(($) => Q.include.includes($));
}
function n7(X, Q) {
  if (!Q) return !0;
  let $ = IU(X);
  return EU($, Q);
}
import { join as bU } from "path";
import { homedir as PU } from "os";
function V4() {
  return process.env.CLAUDE_CONFIG_DIR ?? bU(PU(), ".claude");
}
function H9(X) {
  if (!X) return !1;
  if (typeof X === "boolean") return X;
  let Q = X.toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(Q);
}
import { dirname as z9, join as YW } from "path";
import { cwd as SU } from "process";
import { realpathSync as a7 } from "fs";
import { randomUUID as ZU } from "crypto";
function r7(X) {
  return {
    name: X,
    default: 30000,
    validate: (Q) => {
      if (!Q) return { effective: 30000, status: "valid" };
      let $ = parseInt(Q, 10);
      if (isNaN($) || $ <= 0)
        return {
          effective: 30000,
          status: "invalid",
          message: `Invalid value "${Q}" (using default: 30000)`,
        };
      if ($ > 150000)
        return {
          effective: 150000,
          status: "capped",
          message: `Capped from ${$} to 150000`,
        };
      return { effective: $, status: "valid" };
    },
  };
}
var o7 = r7("BASH_MAX_OUTPUT_LENGTH"),
  Pb = r7("TASK_MAX_OUTPUT_LENGTH"),
  t7 = {
    name: "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
    default: 32000,
    validate: (X) => {
      if (!X) return { effective: 32000, status: "valid" };
      let Y = parseInt(X, 10);
      if (isNaN(Y) || Y <= 0)
        return {
          effective: 32000,
          status: "invalid",
          message: `Invalid value "${X}" (using default: 32000)`,
        };
      if (Y > 64000)
        return {
          effective: 64000,
          status: "capped",
          message: `Capped from ${Y} to 64000`,
        };
      return { effective: Y, status: "valid" };
    },
  };
function CU() {
  let X = "";
  if (
    typeof process < "u" &&
    typeof process.cwd === "function" &&
    typeof a7 === "function"
  )
    X = a7(SU());
  return {
    originalCwd: X,
    projectRoot: X,
    totalCostUSD: 0,
    totalAPIDuration: 0,
    totalAPIDurationWithoutRetries: 0,
    totalToolDuration: 0,
    startTime: Date.now(),
    lastInteractionTime: Date.now(),
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    hasUnknownModelCost: !1,
    cwd: X,
    modelUsage: {},
    mainLoopModelOverride: void 0,
    initialMainLoopModel: null,
    modelStrings: null,
    isInteractive: !1,
    clientType: "cli",
    sessionIngressToken: void 0,
    oauthTokenFromFd: void 0,
    apiKeyFromFd: void 0,
    flagSettingsPath: void 0,
    allowedSettingSources: [
      "userSettings",
      "projectSettings",
      "localSettings",
      "flagSettings",
      "policySettings",
    ],
    meter: null,
    sessionCounter: null,
    locCounter: null,
    prCounter: null,
    commitCounter: null,
    costCounter: null,
    tokenCounter: null,
    codeEditToolDecisionCounter: null,
    activeTimeCounter: null,
    sessionId: ZU(),
    parentSessionId: void 0,
    loggerProvider: null,
    eventLogger: null,
    meterProvider: null,
    tracerProvider: null,
    agentColorMap: new Map(),
    agentColorIndex: 0,
    envVarValidators: [o7, t7],
    lastAPIRequest: null,
    inMemoryErrorLog: [],
    inlinePlugins: [],
    useCoworkPlugins: !1,
    sessionBypassPermissionsMode: !1,
    sessionTrustAccepted: !1,
    sessionPersistenceDisabled: !1,
    hasExitedPlanMode: !1,
    needsPlanModeExitAttachment: !1,
    hasExitedDelegateMode: !1,
    needsDelegateModeExitAttachment: !1,
    lspRecommendationShownThisSession: !1,
    initJsonSchema: null,
    registeredHooks: null,
    planSlugCache: new Map(),
    teleportedSessionInfo: null,
    invokedSkills: new Map(),
    slowOperations: [],
    promptCacheBreaks: [],
    sdkBetas: void 0,
    mainThreadAgentType: void 0,
    isRemoteMode: !1,
    directConnectServerUrl: void 0,
    systemPromptSectionCache: new Map(),
    additionalDirectoriesForClaudeMd: [],
    resumedTranscriptPath: null,
  };
}
var kU = CU();
function s7() {
  return kU.sessionId;
}
function e7({
  writeFn: X,
  flushIntervalMs: Q = 1000,
  maxBufferSize: $ = 100,
  immediateMode: Y = !1,
}) {
  let W = [],
    J = null;
  function G() {
    if (J) clearTimeout(J), (J = null);
  }
  function H() {
    if (W.length === 0) return;
    X(W.join("")), (W = []), G();
  }
  function B() {
    if (!J) J = setTimeout(H, Q);
  }
  return {
    write(z) {
      if (Y) {
        X(z);
        return;
      }
      if ((W.push(z), B(), W.length >= $)) H();
    },
    flush: H,
    dispose() {
      H();
    },
  };
}
var XW = new Set();
function QW(X) {
  return XW.add(X), () => XW.delete(X);
}
var B9 = 1 / 0;
function vU(X) {
  if (X === null) return "null";
  if (X === void 0) return "undefined";
  if (Array.isArray(X)) return `Array[${X.length}]`;
  if (typeof X === "object") return `Object{${Object.keys(X).length} keys}`;
  if (typeof X === "string") return `string(${X.length} chars)`;
  return typeof X;
}
function $W(X, Q) {
  let $ = performance.now();
  try {
    return Q();
  } finally {
    performance.now() - $ > B9;
  }
}
function Z0(X, Q, $) {
  let Y = vU(X);
  return $W(`JSON.stringify(${Y})`, () => JSON.stringify(X, Q, $));
}
var L4 = (X, Q) => {
  let $ = typeof X === "string" ? X.length : 0;
  return $W(`JSON.parse(${$} chars)`, () => JSON.parse(X, Q));
};
var TU = k1(() => {
    return (
      H9(process.env.DEBUG) ||
      H9(process.env.DEBUG_SDK) ||
      process.argv.includes("--debug") ||
      process.argv.includes("-d") ||
      WW() ||
      process.argv.some((X) => X.startsWith("--debug=")) ||
      JW() !== null
    );
  }),
  _U = k1(() => {
    let X = process.argv.find(($) => $.startsWith("--debug="));
    if (!X) return null;
    let Q = X.substring(8);
    return i7(Q);
  }),
  WW = k1(() => {
    return (
      process.argv.includes("--debug-to-stderr") ||
      process.argv.includes("-d2e")
    );
  }),
  JW = k1(() => {
    for (let X = 0; X < process.argv.length; X++) {
      let Q = process.argv[X];
      if (Q.startsWith("--debug-file=")) return Q.substring(13);
      if (Q === "--debug-file" && X + 1 < process.argv.length)
        return process.argv[X + 1];
    }
    return null;
  });
function xU(X) {
  if (
    typeof process > "u" ||
    typeof process.versions > "u" ||
    typeof process.versions.node > "u"
  )
    return !1;
  let Q = _U();
  return n7(X, Q);
}
var yU = !1;
var q4 = null;
function gU() {
  if (!q4)
    (q4 = e7({
      writeFn: (X) => {
        let Q = GW();
        if (!n0().existsSync(z9(Q))) n0().mkdirSync(z9(Q));
        n0().appendFileSync(Q, X), fU();
      },
      flushIntervalMs: 1000,
      maxBufferSize: 100,
      immediateMode: TU(),
    })),
      QW(async () => q4?.dispose());
  return q4;
}
function v1(X, { level: Q } = { level: "debug" }) {
  if (!xU(X)) return;
  if (
    yU &&
    X.includes(`
`)
  )
    X = Z0(X);
  let Y = `${new Date().toISOString()} [${Q.toUpperCase()}] ${X.trim()}
`;
  if (WW()) {
    d7(Y);
    return;
  }
  gU().write(Y);
}
function GW() {
  return (
    JW() ??
    process.env.CLAUDE_CODE_DEBUG_LOGS_DIR ??
    YW(V4(), "debug", `${s7()}.txt`)
  );
}
var fU = k1(() => {
  if (process.argv[2] === "--ripgrep") return;
  try {
    let X = GW(),
      Q = z9(X),
      $ = YW(Q, "latest");
    if (!n0().existsSync(Q)) n0().mkdirSync(Q);
    if (n0().existsSync($))
      try {
        n0().unlinkSync($);
      } catch {}
    n0().symlinkSync(X, $);
  } catch {}
});
var pU = !1;
function F0(X, Q) {
  let $ = performance.now();
  try {
    return Q();
  } finally {
    performance.now() - $ > B9;
  }
}
var dU = {
    cwd() {
      return process.cwd();
    },
    existsSync(X) {
      return F0(`existsSync(${X})`, () => h.existsSync(X));
    },
    async stat(X) {
      return hU(X);
    },
    async readdir(X) {
      return uU(X, { withFileTypes: !0 });
    },
    async unlink(X) {
      return lU(X);
    },
    async rmdir(X) {
      return mU(X);
    },
    async rm(X, Q) {
      return cU(X, Q);
    },
    statSync(X) {
      return F0(`statSync(${X})`, () => h.statSync(X));
    },
    lstatSync(X) {
      return F0(`lstatSync(${X})`, () => h.lstatSync(X));
    },
    readFileSync(X, Q) {
      return F0(`readFileSync(${X})`, () =>
        h.readFileSync(X, { encoding: Q.encoding })
      );
    },
    readFileBytesSync(X) {
      return F0(`readFileBytesSync(${X})`, () => h.readFileSync(X));
    },
    readSync(X, Q) {
      return F0(`readSync(${X}, ${Q.length} bytes)`, () => {
        let $ = void 0;
        try {
          $ = h.openSync(X, "r");
          let Y = Buffer.alloc(Q.length),
            W = h.readSync($, Y, 0, Q.length, 0);
          return { buffer: Y, bytesRead: W };
        } finally {
          if ($) h.closeSync($);
        }
      });
    },
    appendFileSync(X, Q, $) {
      return F0(`appendFileSync(${X}, ${Q.length} chars)`, () => {
        if (!h.existsSync(X) && $?.mode !== void 0) {
          let Y = h.openSync(X, "a", $.mode);
          try {
            h.appendFileSync(Y, Q);
          } finally {
            h.closeSync(Y);
          }
        } else h.appendFileSync(X, Q);
      });
    },
    copyFileSync(X, Q) {
      return F0(`copyFileSync(${X} → ${Q})`, () => h.copyFileSync(X, Q));
    },
    unlinkSync(X) {
      return F0(`unlinkSync(${X})`, () => h.unlinkSync(X));
    },
    renameSync(X, Q) {
      return F0(`renameSync(${X} → ${Q})`, () => h.renameSync(X, Q));
    },
    linkSync(X, Q) {
      return F0(`linkSync(${X} → ${Q})`, () => h.linkSync(X, Q));
    },
    symlinkSync(X, Q) {
      return F0(`symlinkSync(${X} → ${Q})`, () => h.symlinkSync(X, Q));
    },
    readlinkSync(X) {
      return F0(`readlinkSync(${X})`, () => h.readlinkSync(X));
    },
    realpathSync(X) {
      return F0(`realpathSync(${X})`, () => h.realpathSync(X));
    },
    mkdirSync(X, Q) {
      return F0(`mkdirSync(${X})`, () => {
        if (!h.existsSync(X)) {
          let $ = { recursive: !0 };
          if (Q?.mode !== void 0) $.mode = Q.mode;
          h.mkdirSync(X, $);
        }
      });
    },
    readdirSync(X) {
      return F0(`readdirSync(${X})`, () =>
        h.readdirSync(X, { withFileTypes: !0 })
      );
    },
    readdirStringSync(X) {
      return F0(`readdirStringSync(${X})`, () => h.readdirSync(X));
    },
    isDirEmptySync(X) {
      return F0(`isDirEmptySync(${X})`, () => {
        return this.readdirSync(X).length === 0;
      });
    },
    rmdirSync(X) {
      return F0(`rmdirSync(${X})`, () => h.rmdirSync(X));
    },
    rmSync(X, Q) {
      return F0(`rmSync(${X})`, () => h.rmSync(X, Q));
    },
    createWriteStream(X) {
      return h.createWriteStream(X);
    },
  },
  iU = dU;
function n0() {
  return iU;
}
var nU = [
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "Notification",
    "UserPromptSubmit",
    "SessionStart",
    "SessionEnd",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
    "PermissionRequest",
    "Setup",
    "TeammateIdle",
    "TaskCompleted",
  ],
  rU = [
    "clear",
    "logout",
    "prompt_input_exit",
    "other",
    "bypass_permissions_disabled",
  ];
class F1 extends Error {}
function M6() {
  return process.versions.bun !== void 0;
}
import { randomUUID as oU } from "crypto";
import { appendFileSync as tU, existsSync as aU, mkdirSync as sU } from "fs";
import { join as HW } from "path";
var F4 = null,
  BW = !1;
function eU() {
  if (BW) return F4;
  if (((BW = !0), !process.env.DEBUG_CLAUDE_AGENT_SDK)) return null;
  let X = HW(V4(), "debug");
  if (((F4 = HW(X, `sdk-${oU()}.txt`)), !aU(X))) sU(X, { recursive: !0 });
  return (
    process.stderr.write(`SDK debug logs: ${F4}
`),
    F4
  );
}
function N1(X) {
  let Q = eU();
  if (!Q) return;
  let Y = `${new Date().toISOString()} ${X}
`;
  tU(Q, Y);
}
function zW(X, Q) {
  let $ = { ...X };
  if (Q) {
    let Y = { sandbox: Q };
    if ($.settings)
      try {
        Y = { ...L4($.settings), sandbox: Q };
      } catch {}
    $.settings = Z0(Y);
  }
  return $;
}
class XX {
  options;
  process;
  processStdin;
  processStdout;
  ready = !1;
  abortController;
  exitError;
  exitListeners = [];
  processExitHandler;
  abortHandler;
  constructor(X) {
    this.options = X;
    (this.abortController = X.abortController || F6()), this.initialize();
  }
  getDefaultExecutable() {
    return M6() ? "bun" : "node";
  }
  spawnLocalProcess(X) {
    let { command: Q, args: $, cwd: Y, env: W, signal: J } = X,
      G = W.DEBUG_CLAUDE_AGENT_SDK || this.options.stderr ? "pipe" : "ignore",
      H = XV(Q, $, {
        cwd: Y,
        stdio: ["pipe", "pipe", G],
        signal: J,
        env: W,
        windowsHide: !0,
      });
    if (W.DEBUG_CLAUDE_AGENT_SDK || this.options.stderr)
      H.stderr.on("data", (z) => {
        let K = z.toString();
        if ((N1(K), this.options.stderr)) this.options.stderr(K);
      });
    return {
      stdin: H.stdin,
      stdout: H.stdout,
      get killed() {
        return H.killed;
      },
      get exitCode() {
        return H.exitCode;
      },
      kill: H.kill.bind(H),
      on: H.on.bind(H),
      once: H.once.bind(H),
      off: H.off.bind(H),
    };
  }
  initialize() {
    try {
      let {
          additionalDirectories: X = [],
          agent: Q,
          betas: $,
          cwd: Y,
          executable: W = this.getDefaultExecutable(),
          executableArgs: J = [],
          extraArgs: G = {},
          pathToClaudeCodeExecutable: H,
          env: B = { ...process.env },
          maxThinkingTokens: z,
          maxTurns: K,
          maxBudgetUsd: V,
          model: L,
          fallbackModel: U,
          jsonSchema: F,
          permissionMode: q,
          allowDangerouslySkipPermissions: N,
          permissionPromptToolName: w,
          continueConversation: M,
          resume: R,
          settingSources: S,
          allowedTools: C = [],
          disallowedTools: K0 = [],
          tools: U0,
          mcpServers: s,
          strictMcpConfig: D0,
          canUseTool: q0,
          includePartialMessages: L1,
          plugins: P1,
          sandbox: o1,
        } = this.options,
        c = [
          "--output-format",
          "stream-json",
          "--verbose",
          "--input-format",
          "stream-json",
        ];
      if (z !== void 0) c.push("--max-thinking-tokens", z.toString());
      if (K) c.push("--max-turns", K.toString());
      if (V !== void 0) c.push("--max-budget-usd", V.toString());
      if (L) c.push("--model", L);
      if (Q) c.push("--agent", Q);
      if ($ && $.length > 0) c.push("--betas", $.join(","));
      if (F) c.push("--json-schema", Z0(F));
      if (this.options.debugFile)
        c.push("--debug-file", this.options.debugFile);
      else if (this.options.debug) c.push("--debug");
      if (B.DEBUG_CLAUDE_AGENT_SDK) c.push("--debug-to-stderr");
      if (q0) {
        if (w)
          throw Error(
            "canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other."
          );
        c.push("--permission-prompt-tool", "stdio");
      } else if (w) c.push("--permission-prompt-tool", w);
      if (M) c.push("--continue");
      if (R) c.push("--resume", R);
      if (C.length > 0) c.push("--allowedTools", C.join(","));
      if (K0.length > 0) c.push("--disallowedTools", K0.join(","));
      if (U0 !== void 0)
        if (Array.isArray(U0))
          if (U0.length === 0) c.push("--tools", "");
          else c.push("--tools", U0.join(","));
        else c.push("--tools", "default");
      if (s && Object.keys(s).length > 0)
        c.push("--mcp-config", Z0({ mcpServers: s }));
      if (S) c.push("--setting-sources", S.join(","));
      if (D0) c.push("--strict-mcp-config");
      if (q) c.push("--permission-mode", q);
      if (N) c.push("--allow-dangerously-skip-permissions");
      if (U) {
        if (L && U === L)
          throw Error(
            "Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option."
          );
        c.push("--fallback-model", U);
      }
      if (L1) c.push("--include-partial-messages");
      for (let E0 of X) c.push("--add-dir", E0);
      if (P1 && P1.length > 0)
        for (let E0 of P1)
          if (E0.type === "local") c.push("--plugin-dir", E0.path);
          else throw Error(`Unsupported plugin type: ${E0.type}`);
      if (this.options.forkSession) c.push("--fork-session");
      if (this.options.resumeSessionAt)
        c.push("--resume-session-at", this.options.resumeSessionAt);
      if (this.options.sessionId)
        c.push("--session-id", this.options.sessionId);
      if (this.options.persistSession === !1)
        c.push("--no-session-persistence");
      let Q9 = zW(G ?? {}, o1);
      for (let [E0, S1] of Object.entries(Q9))
        if (S1 === null) c.push(`--${E0}`);
        else c.push(`--${E0}`, S1);
      if (!B.CLAUDE_CODE_ENTRYPOINT) B.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      if ((delete B.NODE_OPTIONS, B.DEBUG_CLAUDE_AGENT_SDK)) B.DEBUG = "1";
      else delete B.DEBUG;
      let r6 = $V(H),
        o6 = r6 ? H : W,
        t6 = r6 ? [...J, ...c] : [...J, H, ...c],
        a6 = {
          command: o6,
          args: t6,
          cwd: Y,
          env: B,
          signal: this.abortController.signal,
        };
      if (this.options.spawnClaudeCodeProcess)
        N1(`Spawning Claude Code (custom): ${o6} ${t6.join(" ")}`),
          (this.process = this.options.spawnClaudeCodeProcess(a6));
      else {
        if (!n0().existsSync(H)) {
          let S1 = r6
            ? `Claude Code native binary not found at ${H}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.`
            : `Claude Code executable not found at ${H}. Is options.pathToClaudeCodeExecutable set?`;
          throw ReferenceError(S1);
        }
        N1(`Spawning Claude Code: ${o6} ${t6.join(" ")}`),
          (this.process = this.spawnLocalProcess(a6));
      }
      (this.processStdin = this.process.stdin),
        (this.processStdout = this.process.stdout);
      let B4 = () => {
        if (this.process && !this.process.killed) this.process.kill("SIGTERM");
      };
      (this.processExitHandler = B4),
        (this.abortHandler = B4),
        process.on("exit", this.processExitHandler),
        this.abortController.signal.addEventListener(
          "abort",
          this.abortHandler
        ),
        this.process.on("error", (E0) => {
          if (((this.ready = !1), this.abortController.signal.aborted))
            this.exitError = new F1("Claude Code process aborted by user");
          else
            (this.exitError = Error(
              `Failed to spawn Claude Code process: ${E0.message}`
            )),
              N1(this.exitError.message);
        }),
        this.process.on("exit", (E0, S1) => {
          if (((this.ready = !1), this.abortController.signal.aborted))
            this.exitError = new F1("Claude Code process aborted by user");
          else {
            let s6 = this.getProcessExitError(E0, S1);
            if (s6) (this.exitError = s6), N1(s6.message);
          }
        }),
        (this.ready = !0);
    } catch (X) {
      throw ((this.ready = !1), X);
    }
  }
  getProcessExitError(X, Q) {
    if (X !== 0 && X !== null)
      return Error(`Claude Code process exited with code ${X}`);
    else if (Q) return Error(`Claude Code process terminated by signal ${Q}`);
    return;
  }
  write(X) {
    if (this.abortController.signal.aborted) throw new F1("Operation aborted");
    if (!this.ready || !this.processStdin)
      throw Error("ProcessTransport is not ready for writing");
    if (this.process?.killed || this.process?.exitCode !== null)
      throw Error("Cannot write to terminated process");
    if (this.exitError)
      throw Error(
        `Cannot write to process that exited with error: ${this.exitError.message}`
      );
    N1(`[ProcessTransport] Writing to stdin: ${X.substring(0, 100)}`);
    try {
      if (!this.processStdin.write(X))
        N1("[ProcessTransport] Write buffer full, data queued");
    } catch (Q) {
      throw (
        ((this.ready = !1),
        Error(`Failed to write to process stdin: ${Q.message}`))
      );
    }
  }
  close() {
    if (this.processStdin)
      this.processStdin.end(), (this.processStdin = void 0);
    if (this.abortHandler)
      this.abortController.signal.removeEventListener(
        "abort",
        this.abortHandler
      ),
        (this.abortHandler = void 0);
    for (let { handler: X } of this.exitListeners) this.process?.off("exit", X);
    if (((this.exitListeners = []), this.process && !this.process.killed))
      this.process.kill("SIGTERM"),
        setTimeout(() => {
          if (this.process && !this.process.killed)
            this.process.kill("SIGKILL");
        }, 5000);
    if (((this.ready = !1), this.processExitHandler))
      process.off("exit", this.processExitHandler),
        (this.processExitHandler = void 0);
  }
  isReady() {
    return this.ready;
  }
  async *readMessages() {
    if (!this.processStdout)
      throw Error("ProcessTransport output stream not available");
    let X = QV({ input: this.processStdout });
    try {
      for await (let Q of X)
        if (Q.trim())
          try {
            yield L4(Q);
          } catch ($) {
            throw (
              (N1(`Non-JSON stdout: ${Q}`),
              Error(
                `CLI output was not valid JSON. This may indicate an error during startup. Output: ${Q.slice(
                  0,
                  200
                )}${Q.length > 200 ? "..." : ""}`
              ))
            );
          }
      await this.waitForExit();
    } catch (Q) {
      throw Q;
    } finally {
      X.close();
    }
  }
  endInput() {
    if (this.processStdin) this.processStdin.end();
  }
  getInputStream() {
    return this.processStdin;
  }
  onExit(X) {
    if (!this.process) return () => {};
    let Q = ($, Y) => {
      let W = this.getProcessExitError($, Y);
      X(W);
    };
    return (
      this.process.on("exit", Q),
      this.exitListeners.push({ callback: X, handler: Q }),
      () => {
        if (this.process) this.process.off("exit", Q);
        let $ = this.exitListeners.findIndex((Y) => Y.handler === Q);
        if ($ !== -1) this.exitListeners.splice($, 1);
      }
    );
  }
  async waitForExit() {
    if (!this.process) {
      if (this.exitError) throw this.exitError;
      return;
    }
    if (this.process.exitCode !== null || this.process.killed) {
      if (this.exitError) throw this.exitError;
      return;
    }
    return new Promise((X, Q) => {
      let $ = (W, J) => {
        if (this.abortController.signal.aborted) {
          Q(new F1("Operation aborted"));
          return;
        }
        let G = this.getProcessExitError(W, J);
        if (G) Q(G);
        else X();
      };
      this.process.once("exit", $);
      let Y = (W) => {
        this.process.off("exit", $), Q(W);
      };
      this.process.once("error", Y),
        this.process.once("exit", () => {
          this.process.off("error", Y);
        });
    });
  }
}
function $V(X) {
  return ![".js", ".mjs", ".tsx", ".ts", ".jsx"].some(($) => X.endsWith($));
}
class QX {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = !1;
  hasError;
  started = !1;
  constructor(X) {
    this.returned = X;
  }
  [Symbol.asyncIterator]() {
    if (this.started) throw Error("Stream can only be iterated once");
    return (this.started = !0), this;
  }
  next() {
    if (this.queue.length > 0)
      return Promise.resolve({ done: !1, value: this.queue.shift() });
    if (this.isDone) return Promise.resolve({ done: !0, value: void 0 });
    if (this.hasError) return Promise.reject(this.hasError);
    return new Promise((X, Q) => {
      (this.readResolve = X), (this.readReject = Q);
    });
  }
  enqueue(X) {
    if (this.readResolve) {
      let Q = this.readResolve;
      (this.readResolve = void 0),
        (this.readReject = void 0),
        Q({ done: !1, value: X });
    } else this.queue.push(X);
  }
  done() {
    if (((this.isDone = !0), this.readResolve)) {
      let X = this.readResolve;
      (this.readResolve = void 0),
        (this.readReject = void 0),
        X({ done: !0, value: void 0 });
    }
  }
  error(X) {
    if (((this.hasError = X), this.readReject)) {
      let Q = this.readReject;
      (this.readResolve = void 0), (this.readReject = void 0), Q(X);
    }
  }
  return() {
    if (((this.isDone = !0), this.returned)) this.returned();
    return Promise.resolve({ done: !0, value: void 0 });
  }
}
class K9 {
  sendMcpMessage;
  isClosed = !1;
  constructor(X) {
    this.sendMcpMessage = X;
  }
  onclose;
  onerror;
  onmessage;
  async start() {}
  async send(X) {
    if (this.isClosed) throw Error("Transport is closed");
    this.sendMcpMessage(X);
  }
  async close() {
    if (this.isClosed) return;
    (this.isClosed = !0), this.onclose?.();
  }
}
import { randomUUID as YV } from "crypto";
class $X {
  transport;
  isSingleUserTurn;
  canUseTool;
  hooks;
  abortController;
  jsonSchema;
  initConfig;
  pendingControlResponses = new Map();
  cleanupPerformed = !1;
  sdkMessages;
  inputStream = new QX();
  initialization;
  cancelControllers = new Map();
  hookCallbacks = new Map();
  nextCallbackId = 0;
  sdkMcpTransports = new Map();
  sdkMcpServerInstances = new Map();
  pendingMcpResponses = new Map();
  firstResultReceivedResolve;
  firstResultReceived = !1;
  hasBidirectionalNeeds() {
    return (
      this.sdkMcpTransports.size > 0 ||
      (this.hooks !== void 0 && Object.keys(this.hooks).length > 0) ||
      this.canUseTool !== void 0
    );
  }
  constructor(X, Q, $, Y, W, J = new Map(), G, H) {
    this.transport = X;
    this.isSingleUserTurn = Q;
    this.canUseTool = $;
    this.hooks = Y;
    this.abortController = W;
    this.jsonSchema = G;
    this.initConfig = H;
    for (let [B, z] of J) this.connectSdkMcpServer(B, z);
    (this.sdkMessages = this.readSdkMessages()),
      this.readMessages(),
      (this.initialization = this.initialize()),
      this.initialization.catch(() => {});
  }
  setError(X) {
    this.inputStream.error(X);
  }
  close() {
    this.cleanup();
  }
  cleanup(X) {
    if (this.cleanupPerformed) return;
    this.cleanupPerformed = !0;
    try {
      this.transport.close(),
        this.pendingControlResponses.clear(),
        this.pendingMcpResponses.clear(),
        this.cancelControllers.clear(),
        this.hookCallbacks.clear();
      for (let Q of this.sdkMcpTransports.values())
        try {
          Q.close();
        } catch {}
      if ((this.sdkMcpTransports.clear(), X)) this.inputStream.error(X);
      else this.inputStream.done();
    } catch (Q) {}
  }
  next(...[X]) {
    return this.sdkMessages.next(...[X]);
  }
  return(X) {
    return this.sdkMessages.return(X);
  }
  throw(X) {
    return this.sdkMessages.throw(X);
  }
  [Symbol.asyncIterator]() {
    return this.sdkMessages;
  }
  [Symbol.asyncDispose]() {
    return this.sdkMessages[Symbol.asyncDispose]();
  }
  async readMessages() {
    try {
      for await (let X of this.transport.readMessages()) {
        if (X.type === "control_response") {
          let Q = this.pendingControlResponses.get(X.response.request_id);
          if (Q) Q(X.response);
          continue;
        } else if (X.type === "control_request") {
          this.handleControlRequest(X);
          continue;
        } else if (X.type === "control_cancel_request") {
          this.handleControlCancelRequest(X);
          continue;
        } else if (X.type === "keep_alive") continue;
        if (
          X.type === "streamlined_text" ||
          X.type === "streamlined_tool_use_summary"
        )
          continue;
        if (X.type === "result") {
          if (
            ((this.firstResultReceived = !0), this.firstResultReceivedResolve)
          )
            this.firstResultReceivedResolve();
          if (this.isSingleUserTurn)
            v1(
              "[Query.readMessages] First result received for single-turn query, closing stdin"
            ),
              this.transport.endInput();
        }
        this.inputStream.enqueue(X);
      }
      if (this.firstResultReceivedResolve) this.firstResultReceivedResolve();
      this.inputStream.done(), this.cleanup();
    } catch (X) {
      if (this.firstResultReceivedResolve) this.firstResultReceivedResolve();
      this.inputStream.error(X), this.cleanup(X);
    }
  }
  async handleControlRequest(X) {
    let Q = new AbortController();
    this.cancelControllers.set(X.request_id, Q);
    try {
      let $ = await this.processControlRequest(X, Q.signal),
        Y = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: X.request_id,
            response: $,
          },
        };
      await Promise.resolve(
        this.transport.write(
          Z0(Y) +
            `
`
        )
      );
    } catch ($) {
      let Y = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: X.request_id,
          error: $.message || String($),
        },
      };
      await Promise.resolve(
        this.transport.write(
          Z0(Y) +
            `
`
        )
      );
    } finally {
      this.cancelControllers.delete(X.request_id);
    }
  }
  handleControlCancelRequest(X) {
    let Q = this.cancelControllers.get(X.request_id);
    if (Q) Q.abort(), this.cancelControllers.delete(X.request_id);
  }
  async processControlRequest(X, Q) {
    if (X.request.subtype === "can_use_tool") {
      if (!this.canUseTool) throw Error("canUseTool callback is not provided.");
      return {
        ...(await this.canUseTool(X.request.tool_name, X.request.input, {
          signal: Q,
          suggestions: X.request.permission_suggestions,
          blockedPath: X.request.blocked_path,
          decisionReason: X.request.decision_reason,
          toolUseID: X.request.tool_use_id,
          agentID: X.request.agent_id,
        })),
        toolUseID: X.request.tool_use_id,
      };
    } else if (X.request.subtype === "hook_callback")
      return await this.handleHookCallbacks(
        X.request.callback_id,
        X.request.input,
        X.request.tool_use_id,
        Q
      );
    else if (X.request.subtype === "mcp_message") {
      let $ = X.request,
        Y = this.sdkMcpTransports.get($.server_name);
      if (!Y) throw Error(`SDK MCP server not found: ${$.server_name}`);
      if ("method" in $.message && "id" in $.message && $.message.id !== null)
        return {
          mcp_response: await this.handleMcpControlRequest($.server_name, $, Y),
        };
      else {
        if (Y.onmessage) Y.onmessage($.message);
        return { mcp_response: { jsonrpc: "2.0", result: {}, id: 0 } };
      }
    }
    throw Error("Unsupported control request subtype: " + X.request.subtype);
  }
  async *readSdkMessages() {
    for await (let X of this.inputStream) yield X;
  }
  async initialize() {
    let X;
    if (this.hooks) {
      X = {};
      for (let [W, J] of Object.entries(this.hooks))
        if (J.length > 0)
          X[W] = J.map((G) => {
            let H = [];
            for (let B of G.hooks) {
              let z = `hook_${this.nextCallbackId++}`;
              this.hookCallbacks.set(z, B), H.push(z);
            }
            return {
              matcher: G.matcher,
              hookCallbackIds: H,
              timeout: G.timeout,
            };
          });
    }
    let Q =
        this.sdkMcpTransports.size > 0
          ? Array.from(this.sdkMcpTransports.keys())
          : void 0,
      $ = {
        subtype: "initialize",
        hooks: X,
        sdkMcpServers: Q,
        jsonSchema: this.jsonSchema,
        systemPrompt: this.initConfig?.systemPrompt,
        appendSystemPrompt: this.initConfig?.appendSystemPrompt,
        agents: this.initConfig?.agents,
      };
    return (await this.request($)).response;
  }
  async interrupt() {
    await this.request({ subtype: "interrupt" });
  }
  async setPermissionMode(X) {
    await this.request({ subtype: "set_permission_mode", mode: X });
  }
  async setModel(X) {
    await this.request({ subtype: "set_model", model: X });
  }
  async setMaxThinkingTokens(X) {
    await this.request({
      subtype: "set_max_thinking_tokens",
      max_thinking_tokens: X,
    });
  }
  async rewindFiles(X, Q) {
    return (
      await this.request({
        subtype: "rewind_files",
        user_message_id: X,
        dry_run: Q?.dryRun,
      })
    ).response;
  }
  async processPendingPermissionRequests(X) {
    for (let Q of X)
      if (Q.request.subtype === "can_use_tool")
        this.handleControlRequest(Q).catch(() => {});
  }
  request(X) {
    let Q = Math.random().toString(36).substring(2, 15),
      $ = { request_id: Q, type: "control_request", request: X };
    return new Promise((Y, W) => {
      this.pendingControlResponses.set(Q, (J) => {
        if (J.subtype === "success") Y(J);
        else if ((W(Error(J.error)), J.pending_permission_requests))
          this.processPendingPermissionRequests(J.pending_permission_requests);
      }),
        Promise.resolve(
          this.transport.write(
            Z0($) +
              `
`
          )
        );
    });
  }
  async initializationResult() {
    return this.initialization;
  }
  async supportedCommands() {
    return (await this.initialization).commands;
  }
  async supportedModels() {
    return (await this.initialization).models;
  }
  async reconnectMcpServer(X) {
    await this.request({ subtype: "mcp_reconnect", serverName: X });
  }
  async toggleMcpServer(X, Q) {
    await this.request({ subtype: "mcp_toggle", serverName: X, enabled: Q });
  }
  async mcpServerStatus() {
    return (await this.request({ subtype: "mcp_status" })).response.mcpServers;
  }
  async setMcpServers(X) {
    let Q = {},
      $ = {};
    for (let [H, B] of Object.entries(X))
      if (B.type === "sdk" && "instance" in B) Q[H] = B.instance;
      else $[H] = B;
    let Y = new Set(this.sdkMcpServerInstances.keys()),
      W = new Set(Object.keys(Q));
    for (let H of Y) if (!W.has(H)) await this.disconnectSdkMcpServer(H);
    for (let [H, B] of Object.entries(Q))
      if (!Y.has(H)) this.connectSdkMcpServer(H, B);
    let J = {};
    for (let H of Object.keys(Q)) J[H] = { type: "sdk", name: H };
    return (
      await this.request({
        subtype: "mcp_set_servers",
        servers: { ...$, ...J },
      })
    ).response;
  }
  async accountInfo() {
    return (await this.initialization).account;
  }
  async streamInput(X) {
    v1("[Query.streamInput] Starting to process input stream");
    try {
      let Q = 0;
      for await (let $ of X) {
        if (
          (Q++,
          v1(`[Query.streamInput] Processing message ${Q}: ${$.type}`),
          this.abortController?.signal.aborted)
        )
          break;
        await Promise.resolve(
          this.transport.write(
            Z0($) +
              `
`
          )
        );
      }
      if (
        (v1(
          `[Query.streamInput] Finished processing ${Q} messages from input stream`
        ),
        Q > 0 && this.hasBidirectionalNeeds())
      )
        v1(
          "[Query.streamInput] Has bidirectional needs, waiting for first result"
        ),
          await this.waitForFirstResult();
      v1("[Query] Calling transport.endInput() to close stdin to CLI process"),
        this.transport.endInput();
    } catch (Q) {
      if (!(Q instanceof F1)) throw Q;
    }
  }
  waitForFirstResult() {
    if (this.firstResultReceived)
      return (
        v1(
          "[Query.waitForFirstResult] Result already received, returning immediately"
        ),
        Promise.resolve()
      );
    return new Promise((X) => {
      if (this.abortController?.signal.aborted) {
        X();
        return;
      }
      this.abortController?.signal.addEventListener("abort", () => X(), {
        once: !0,
      }),
        (this.firstResultReceivedResolve = X);
    });
  }
  handleHookCallbacks(X, Q, $, Y) {
    let W = this.hookCallbacks.get(X);
    if (!W) throw Error(`No hook callback found for ID: ${X}`);
    return W(Q, $, { signal: Y });
  }
  connectSdkMcpServer(X, Q) {
    let $ = new K9((Y) => this.sendMcpServerMessageToCli(X, Y));
    this.sdkMcpTransports.set(X, $),
      this.sdkMcpServerInstances.set(X, Q),
      Q.connect($);
  }
  async disconnectSdkMcpServer(X) {
    let Q = this.sdkMcpTransports.get(X);
    if (Q) await Q.close(), this.sdkMcpTransports.delete(X);
    this.sdkMcpServerInstances.delete(X);
  }
  sendMcpServerMessageToCli(X, Q) {
    if ("id" in Q && Q.id !== null && Q.id !== void 0) {
      let Y = `${X}:${Q.id}`,
        W = this.pendingMcpResponses.get(Y);
      if (W) {
        W.resolve(Q), this.pendingMcpResponses.delete(Y);
        return;
      }
    }
    let $ = {
      type: "control_request",
      request_id: YV(),
      request: { subtype: "mcp_message", server_name: X, message: Q },
    };
    this.transport.write(
      Z0($) +
        `
`
    );
  }
  handleMcpControlRequest(X, Q, $) {
    let Y = "id" in Q.message ? Q.message.id : null,
      W = `${X}:${Y}`;
    return new Promise((J, G) => {
      let H = () => {
          this.pendingMcpResponses.delete(W);
        },
        B = (K) => {
          H(), J(K);
        },
        z = (K) => {
          H(), G(K);
        };
      if (
        (this.pendingMcpResponses.set(W, { resolve: B, reject: z }),
        $.onmessage)
      )
        $.onmessage(Q.message);
      else {
        H(), G(Error("No message handler registered"));
        return;
      }
    });
  }
}
import { join as KW } from "path";
import { fileURLToPath as WV } from "url";
class U9 {
  closed = !1;
  inputStream;
  query;
  queryIterator = null;
  abortController;
  _sessionId = null;
  get sessionId() {
    if (this._sessionId === null)
      throw Error("Session ID not available until after receiving messages");
    return this._sessionId;
  }
  constructor(X) {
    if (X.resume) this._sessionId = X.resume;
    this.inputStream = new QX();
    let Q = X.pathToClaudeCodeExecutable;
    if (!Q) {
      let W = WV(import.meta.url),
        J = KW(W, "..");
      Q = KW(J, "cli.js");
    }
    let $ = { ...(X.env ?? process.env) };
    if (!$.CLAUDE_CODE_ENTRYPOINT) $.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
    this.abortController = F6();
    let Y = new XX({
      abortController: this.abortController,
      pathToClaudeCodeExecutable: Q,
      env: $,
      executable: X.executable ?? (M6() ? "bun" : "node"),
      executableArgs: X.executableArgs ?? [],
      extraArgs: {},
      maxThinkingTokens: void 0,
      maxTurns: void 0,
      maxBudgetUsd: void 0,
      model: X.model,
      fallbackModel: void 0,
      permissionMode: X.permissionMode ?? "default",
      allowDangerouslySkipPermissions: !1,
      continueConversation: !1,
      resume: X.resume,
      settingSources: [],
      allowedTools: X.allowedTools ?? [],
      disallowedTools: X.disallowedTools ?? [],
      mcpServers: {},
      strictMcpConfig: !1,
      canUseTool: !!X.canUseTool,
      hooks: !!X.hooks,
      includePartialMessages: !1,
      forkSession: !1,
      resumeSessionAt: void 0,
    });
    (this.query = new $X(
      Y,
      !1,
      X.canUseTool,
      X.hooks,
      this.abortController,
      new Map()
    )),
      this.query.streamInput(this.inputStream);
  }
  async send(X) {
    if (this.closed) throw Error("Cannot send to closed session");
    let Q =
      typeof X === "string"
        ? {
            type: "user",
            session_id: "",
            message: { role: "user", content: [{ type: "text", text: X }] },
            parent_tool_use_id: null,
          }
        : X;
    this.inputStream.enqueue(Q);
  }
  async *stream() {
    if (!this.queryIterator)
      this.queryIterator = this.query[Symbol.asyncIterator]();
    while (!0) {
      let { value: X, done: Q } = await this.queryIterator.next();
      if (Q) return;
      if (X.type === "system" && X.subtype === "init")
        this._sessionId = X.session_id;
      if ((yield X, X.type === "result")) return;
    }
  }
  close() {
    if (this.closed) return;
    (this.closed = !0), this.inputStream.done(), this.abortController.abort();
  }
  async [Symbol.asyncDispose]() {
    this.close();
  }
}
function V9(X) {
  return new U9(X);
}
function UW(X, Q) {
  return new U9({ ...Q, resume: X });
}
var n;
(function (X) {
  X.assertEqual = (W) => {};
  function Q(W) {}
  X.assertIs = Q;
  function $(W) {
    throw Error();
  }
  (X.assertNever = $),
    (X.arrayToEnum = (W) => {
      let J = {};
      for (let G of W) J[G] = G;
      return J;
    }),
    (X.getValidEnumValues = (W) => {
      let J = X.objectKeys(W).filter((H) => typeof W[W[H]] !== "number"),
        G = {};
      for (let H of J) G[H] = W[H];
      return X.objectValues(G);
    }),
    (X.objectValues = (W) => {
      return X.objectKeys(W).map(function (J) {
        return W[J];
      });
    }),
    (X.objectKeys =
      typeof Object.keys === "function"
        ? (W) => Object.keys(W)
        : (W) => {
            let J = [];
            for (let G in W)
              if (Object.prototype.hasOwnProperty.call(W, G)) J.push(G);
            return J;
          }),
    (X.find = (W, J) => {
      for (let G of W) if (J(G)) return G;
      return;
    }),
    (X.isInteger =
      typeof Number.isInteger === "function"
        ? (W) => Number.isInteger(W)
        : (W) =>
            typeof W === "number" && Number.isFinite(W) && Math.floor(W) === W);
  function Y(W, J = " | ") {
    return W.map((G) => (typeof G === "string" ? `'${G}'` : G)).join(J);
  }
  (X.joinValues = Y),
    (X.jsonStringifyReplacer = (W, J) => {
      if (typeof J === "bigint") return J.toString();
      return J;
    });
})(n || (n = {}));
var VW;
(function (X) {
  X.mergeShapes = (Q, $) => {
    return { ...Q, ...$ };
  };
})(VW || (VW = {}));
var I = n.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set",
  ]),
  O1 = (X) => {
    switch (typeof X) {
      case "undefined":
        return I.undefined;
      case "string":
        return I.string;
      case "number":
        return Number.isNaN(X) ? I.nan : I.number;
      case "boolean":
        return I.boolean;
      case "function":
        return I.function;
      case "bigint":
        return I.bigint;
      case "symbol":
        return I.symbol;
      case "object":
        if (Array.isArray(X)) return I.array;
        if (X === null) return I.null;
        if (
          X.then &&
          typeof X.then === "function" &&
          X.catch &&
          typeof X.catch === "function"
        )
          return I.promise;
        if (typeof Map < "u" && X instanceof Map) return I.map;
        if (typeof Set < "u" && X instanceof Set) return I.set;
        if (typeof Date < "u" && X instanceof Date) return I.date;
        return I.object;
      default:
        return I.unknown;
    }
  };
var A = n.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite",
]);
class h0 extends Error {
  get errors() {
    return this.issues;
  }
  constructor(X) {
    super();
    (this.issues = []),
      (this.addIssue = ($) => {
        this.issues = [...this.issues, $];
      }),
      (this.addIssues = ($ = []) => {
        this.issues = [...this.issues, ...$];
      });
    let Q = new.target.prototype;
    if (Object.setPrototypeOf) Object.setPrototypeOf(this, Q);
    else this.__proto__ = Q;
    (this.name = "ZodError"), (this.issues = X);
  }
  format(X) {
    let Q =
        X ||
        function (W) {
          return W.message;
        },
      $ = { _errors: [] },
      Y = (W) => {
        for (let J of W.issues)
          if (J.code === "invalid_union") J.unionErrors.map(Y);
          else if (J.code === "invalid_return_type") Y(J.returnTypeError);
          else if (J.code === "invalid_arguments") Y(J.argumentsError);
          else if (J.path.length === 0) $._errors.push(Q(J));
          else {
            let G = $,
              H = 0;
            while (H < J.path.length) {
              let B = J.path[H];
              if (H !== J.path.length - 1) G[B] = G[B] || { _errors: [] };
              else (G[B] = G[B] || { _errors: [] }), G[B]._errors.push(Q(J));
              (G = G[B]), H++;
            }
          }
      };
    return Y(this), $;
  }
  static assert(X) {
    if (!(X instanceof h0)) throw Error(`Not a ZodError: ${X}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, n.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(X = (Q) => Q.message) {
    let Q = {},
      $ = [];
    for (let Y of this.issues)
      if (Y.path.length > 0) {
        let W = Y.path[0];
        (Q[W] = Q[W] || []), Q[W].push(X(Y));
      } else $.push(X(Y));
    return { formErrors: $, fieldErrors: Q };
  }
  get formErrors() {
    return this.flatten();
  }
}
h0.create = (X) => {
  return new h0(X);
};
var JV = (X, Q) => {
    let $;
    switch (X.code) {
      case A.invalid_type:
        if (X.received === I.undefined) $ = "Required";
        else $ = `Expected ${X.expected}, received ${X.received}`;
        break;
      case A.invalid_literal:
        $ = `Invalid literal value, expected ${JSON.stringify(
          X.expected,
          n.jsonStringifyReplacer
        )}`;
        break;
      case A.unrecognized_keys:
        $ = `Unrecognized key(s) in object: ${n.joinValues(X.keys, ", ")}`;
        break;
      case A.invalid_union:
        $ = "Invalid input";
        break;
      case A.invalid_union_discriminator:
        $ = `Invalid discriminator value. Expected ${n.joinValues(X.options)}`;
        break;
      case A.invalid_enum_value:
        $ = `Invalid enum value. Expected ${n.joinValues(
          X.options
        )}, received '${X.received}'`;
        break;
      case A.invalid_arguments:
        $ = "Invalid function arguments";
        break;
      case A.invalid_return_type:
        $ = "Invalid function return type";
        break;
      case A.invalid_date:
        $ = "Invalid date";
        break;
      case A.invalid_string:
        if (typeof X.validation === "object")
          if ("includes" in X.validation) {
            if (
              (($ = `Invalid input: must include "${X.validation.includes}"`),
              typeof X.validation.position === "number")
            )
              $ = `${$} at one or more positions greater than or equal to ${X.validation.position}`;
          } else if ("startsWith" in X.validation)
            $ = `Invalid input: must start with "${X.validation.startsWith}"`;
          else if ("endsWith" in X.validation)
            $ = `Invalid input: must end with "${X.validation.endsWith}"`;
          else n.assertNever(X.validation);
        else if (X.validation !== "regex") $ = `Invalid ${X.validation}`;
        else $ = "Invalid";
        break;
      case A.too_small:
        if (X.type === "array")
          $ = `Array must contain ${
            X.exact ? "exactly" : X.inclusive ? "at least" : "more than"
          } ${X.minimum} element(s)`;
        else if (X.type === "string")
          $ = `String must contain ${
            X.exact ? "exactly" : X.inclusive ? "at least" : "over"
          } ${X.minimum} character(s)`;
        else if (X.type === "number")
          $ = `Number must be ${
            X.exact
              ? "exactly equal to "
              : X.inclusive
              ? "greater than or equal to "
              : "greater than "
          }${X.minimum}`;
        else if (X.type === "bigint")
          $ = `Number must be ${
            X.exact
              ? "exactly equal to "
              : X.inclusive
              ? "greater than or equal to "
              : "greater than "
          }${X.minimum}`;
        else if (X.type === "date")
          $ = `Date must be ${
            X.exact
              ? "exactly equal to "
              : X.inclusive
              ? "greater than or equal to "
              : "greater than "
          }${new Date(Number(X.minimum))}`;
        else $ = "Invalid input";
        break;
      case A.too_big:
        if (X.type === "array")
          $ = `Array must contain ${
            X.exact ? "exactly" : X.inclusive ? "at most" : "less than"
          } ${X.maximum} element(s)`;
        else if (X.type === "string")
          $ = `String must contain ${
            X.exact ? "exactly" : X.inclusive ? "at most" : "under"
          } ${X.maximum} character(s)`;
        else if (X.type === "number")
          $ = `Number must be ${
            X.exact
              ? "exactly"
              : X.inclusive
              ? "less than or equal to"
              : "less than"
          } ${X.maximum}`;
        else if (X.type === "bigint")
          $ = `BigInt must be ${
            X.exact
              ? "exactly"
              : X.inclusive
              ? "less than or equal to"
              : "less than"
          } ${X.maximum}`;
        else if (X.type === "date")
          $ = `Date must be ${
            X.exact
              ? "exactly"
              : X.inclusive
              ? "smaller than or equal to"
              : "smaller than"
          } ${new Date(Number(X.maximum))}`;
        else $ = "Invalid input";
        break;
      case A.custom:
        $ = "Invalid input";
        break;
      case A.invalid_intersection_types:
        $ = "Intersection results could not be merged";
        break;
      case A.not_multiple_of:
        $ = `Number must be a multiple of ${X.multipleOf}`;
        break;
      case A.not_finite:
        $ = "Number must be finite";
        break;
      default:
        ($ = Q.defaultError), n.assertNever(X);
    }
    return { message: $ };
  },
  T1 = JV;
var GV = T1;
function YX() {
  return GV;
}
var N4 = (X) => {
  let { data: Q, path: $, errorMaps: Y, issueData: W } = X,
    J = [...$, ...(W.path || [])],
    G = { ...W, path: J };
  if (W.message !== void 0) return { ...W, path: J, message: W.message };
  let H = "",
    B = Y.filter((z) => !!z)
      .slice()
      .reverse();
  for (let z of B) H = z(G, { data: Q, defaultError: H }).message;
  return { ...W, path: J, message: H };
};
function b(X, Q) {
  let $ = YX(),
    Y = N4({
      issueData: Q,
      data: X.data,
      path: X.path,
      errorMaps: [
        X.common.contextualErrorMap,
        X.schemaErrorMap,
        $,
        $ === T1 ? void 0 : T1,
      ].filter((W) => !!W),
    });
  X.common.issues.push(Y);
}
class b0 {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }
  static mergeArray(X, Q) {
    let $ = [];
    for (let Y of Q) {
      if (Y.status === "aborted") return g;
      if (Y.status === "dirty") X.dirty();
      $.push(Y.value);
    }
    return { status: X.value, value: $ };
  }
  static async mergeObjectAsync(X, Q) {
    let $ = [];
    for (let Y of Q) {
      let W = await Y.key,
        J = await Y.value;
      $.push({ key: W, value: J });
    }
    return b0.mergeObjectSync(X, $);
  }
  static mergeObjectSync(X, Q) {
    let $ = {};
    for (let Y of Q) {
      let { key: W, value: J } = Y;
      if (W.status === "aborted") return g;
      if (J.status === "aborted") return g;
      if (W.status === "dirty") X.dirty();
      if (J.status === "dirty") X.dirty();
      if (W.value !== "__proto__" && (typeof J.value < "u" || Y.alwaysSet))
        $[W.value] = J.value;
    }
    return { status: X.value, value: $ };
  }
}
var g = Object.freeze({ status: "aborted" }),
  j6 = (X) => ({ status: "dirty", value: X }),
  C0 = (X) => ({ status: "valid", value: X }),
  L9 = (X) => X.status === "aborted",
  q9 = (X) => X.status === "dirty",
  t1 = (X) => X.status === "valid",
  WX = (X) => typeof Promise < "u" && X instanceof Promise;
var Z;
(function (X) {
  (X.errToObj = (Q) => (typeof Q === "string" ? { message: Q } : Q || {})),
    (X.toString = (Q) => (typeof Q === "string" ? Q : Q?.message));
})(Z || (Z = {}));
class r0 {
  constructor(X, Q, $, Y) {
    (this._cachedPath = []),
      (this.parent = X),
      (this.data = Q),
      (this._path = $),
      (this._key = Y);
  }
  get path() {
    if (!this._cachedPath.length)
      if (Array.isArray(this._key))
        this._cachedPath.push(...this._path, ...this._key);
      else this._cachedPath.push(...this._path, this._key);
    return this._cachedPath;
  }
}
var LW = (X, Q) => {
  if (t1(Q)) return { success: !0, data: Q.value };
  else {
    if (!X.common.issues.length)
      throw Error("Validation failed but no issues detected.");
    return {
      success: !1,
      get error() {
        if (this._error) return this._error;
        let $ = new h0(X.common.issues);
        return (this._error = $), this._error;
      },
    };
  }
};
function l(X) {
  if (!X) return {};
  let {
    errorMap: Q,
    invalid_type_error: $,
    required_error: Y,
    description: W,
  } = X;
  if (Q && ($ || Y))
    throw Error(
      `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`
    );
  if (Q) return { errorMap: Q, description: W };
  return {
    errorMap: (G, H) => {
      let { message: B } = X;
      if (G.code === "invalid_enum_value")
        return { message: B ?? H.defaultError };
      if (typeof H.data > "u") return { message: B ?? Y ?? H.defaultError };
      if (G.code !== "invalid_type") return { message: H.defaultError };
      return { message: B ?? $ ?? H.defaultError };
    },
    description: W,
  };
}
class d {
  get description() {
    return this._def.description;
  }
  _getType(X) {
    return O1(X.data);
  }
  _getOrReturnCtx(X, Q) {
    return (
      Q || {
        common: X.parent.common,
        data: X.data,
        parsedType: O1(X.data),
        schemaErrorMap: this._def.errorMap,
        path: X.path,
        parent: X.parent,
      }
    );
  }
  _processInputParams(X) {
    return {
      status: new b0(),
      ctx: {
        common: X.parent.common,
        data: X.data,
        parsedType: O1(X.data),
        schemaErrorMap: this._def.errorMap,
        path: X.path,
        parent: X.parent,
      },
    };
  }
  _parseSync(X) {
    let Q = this._parse(X);
    if (WX(Q)) throw Error("Synchronous parse encountered promise.");
    return Q;
  }
  _parseAsync(X) {
    let Q = this._parse(X);
    return Promise.resolve(Q);
  }
  parse(X, Q) {
    let $ = this.safeParse(X, Q);
    if ($.success) return $.data;
    throw $.error;
  }
  safeParse(X, Q) {
    let $ = {
        common: {
          issues: [],
          async: Q?.async ?? !1,
          contextualErrorMap: Q?.errorMap,
        },
        path: Q?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: X,
        parsedType: O1(X),
      },
      Y = this._parseSync({ data: X, path: $.path, parent: $ });
    return LW($, Y);
  }
  "~validate"(X) {
    let Q = {
      common: { issues: [], async: !!this["~standard"].async },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: X,
      parsedType: O1(X),
    };
    if (!this["~standard"].async)
      try {
        let $ = this._parseSync({ data: X, path: [], parent: Q });
        return t1($) ? { value: $.value } : { issues: Q.common.issues };
      } catch ($) {
        if ($?.message?.toLowerCase()?.includes("encountered"))
          this["~standard"].async = !0;
        Q.common = { issues: [], async: !0 };
      }
    return this._parseAsync({ data: X, path: [], parent: Q }).then(($) =>
      t1($) ? { value: $.value } : { issues: Q.common.issues }
    );
  }
  async parseAsync(X, Q) {
    let $ = await this.safeParseAsync(X, Q);
    if ($.success) return $.data;
    throw $.error;
  }
  async safeParseAsync(X, Q) {
    let $ = {
        common: { issues: [], contextualErrorMap: Q?.errorMap, async: !0 },
        path: Q?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: X,
        parsedType: O1(X),
      },
      Y = this._parse({ data: X, path: $.path, parent: $ }),
      W = await (WX(Y) ? Y : Promise.resolve(Y));
    return LW($, W);
  }
  refine(X, Q) {
    let $ = (Y) => {
      if (typeof Q === "string" || typeof Q > "u") return { message: Q };
      else if (typeof Q === "function") return Q(Y);
      else return Q;
    };
    return this._refinement((Y, W) => {
      let J = X(Y),
        G = () => W.addIssue({ code: A.custom, ...$(Y) });
      if (typeof Promise < "u" && J instanceof Promise)
        return J.then((H) => {
          if (!H) return G(), !1;
          else return !0;
        });
      if (!J) return G(), !1;
      else return !0;
    });
  }
  refinement(X, Q) {
    return this._refinement(($, Y) => {
      if (!X($)) return Y.addIssue(typeof Q === "function" ? Q($, Y) : Q), !1;
      else return !0;
    });
  }
  _refinement(X) {
    return new G1({
      schema: this,
      typeName: j.ZodEffects,
      effect: { type: "refinement", refinement: X },
    });
  }
  superRefine(X) {
    return this._refinement(X);
  }
  constructor(X) {
    (this.spa = this.safeParseAsync),
      (this._def = X),
      (this.parse = this.parse.bind(this)),
      (this.safeParse = this.safeParse.bind(this)),
      (this.parseAsync = this.parseAsync.bind(this)),
      (this.safeParseAsync = this.safeParseAsync.bind(this)),
      (this.spa = this.spa.bind(this)),
      (this.refine = this.refine.bind(this)),
      (this.refinement = this.refinement.bind(this)),
      (this.superRefine = this.superRefine.bind(this)),
      (this.optional = this.optional.bind(this)),
      (this.nullable = this.nullable.bind(this)),
      (this.nullish = this.nullish.bind(this)),
      (this.array = this.array.bind(this)),
      (this.promise = this.promise.bind(this)),
      (this.or = this.or.bind(this)),
      (this.and = this.and.bind(this)),
      (this.transform = this.transform.bind(this)),
      (this.brand = this.brand.bind(this)),
      (this.default = this.default.bind(this)),
      (this.catch = this.catch.bind(this)),
      (this.describe = this.describe.bind(this)),
      (this.pipe = this.pipe.bind(this)),
      (this.readonly = this.readonly.bind(this)),
      (this.isNullable = this.isNullable.bind(this)),
      (this.isOptional = this.isOptional.bind(this)),
      (this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (Q) => this["~validate"](Q),
      });
  }
  optional() {
    return J1.create(this, this._def);
  }
  nullable() {
    return _1.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return W1.create(this);
  }
  promise() {
    return P6.create(this, this._def);
  }
  or(X) {
    return zX.create([this, X], this._def);
  }
  and(X) {
    return KX.create(this, X, this._def);
  }
  transform(X) {
    return new G1({
      ...l(this._def),
      schema: this,
      typeName: j.ZodEffects,
      effect: { type: "transform", transform: X },
    });
  }
  default(X) {
    let Q = typeof X === "function" ? X : () => X;
    return new qX({
      ...l(this._def),
      innerType: this,
      defaultValue: Q,
      typeName: j.ZodDefault,
    });
  }
  brand() {
    return new D9({ typeName: j.ZodBranded, type: this, ...l(this._def) });
  }
  catch(X) {
    let Q = typeof X === "function" ? X : () => X;
    return new FX({
      ...l(this._def),
      innerType: this,
      catchValue: Q,
      typeName: j.ZodCatch,
    });
  }
  describe(X) {
    return new this.constructor({ ...this._def, description: X });
  }
  pipe(X) {
    return I4.create(this, X);
  }
  readonly() {
    return NX.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var HV = /^c[^\s-]{8,}$/i,
  BV = /^[0-9a-z]+$/,
  zV = /^[0-9A-HJKMNP-TV-Z]{26}$/i,
  KV =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  UV = /^[a-z0-9_-]{21}$/i,
  VV = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  LV =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  qV =
    /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,
  FV = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
  F9,
  NV =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  OV =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  DV =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  wV =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  AV = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  MV = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  qW =
    "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",
  jV = new RegExp(`^${qW}$`);
function FW(X) {
  let Q = "[0-5]\\d";
  if (X.precision) Q = `${Q}\\.\\d{${X.precision}}`;
  else if (X.precision == null) Q = `${Q}(\\.\\d+)?`;
  let $ = X.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${Q})${$}`;
}
function RV(X) {
  return new RegExp(`^${FW(X)}$`);
}
function IV(X) {
  let Q = `${qW}T${FW(X)}`,
    $ = [];
  if (($.push(X.local ? "Z?" : "Z"), X.offset)) $.push("([+-]\\d{2}:?\\d{2})");
  return (Q = `${Q}(${$.join("|")})`), new RegExp(`^${Q}$`);
}
function EV(X, Q) {
  if ((Q === "v4" || !Q) && NV.test(X)) return !0;
  if ((Q === "v6" || !Q) && DV.test(X)) return !0;
  return !1;
}
function bV(X, Q) {
  if (!VV.test(X)) return !1;
  try {
    let [$] = X.split(".");
    if (!$) return !1;
    let Y = $.replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd($.length + ((4 - ($.length % 4)) % 4), "="),
      W = JSON.parse(atob(Y));
    if (typeof W !== "object" || W === null) return !1;
    if ("typ" in W && W?.typ !== "JWT") return !1;
    if (!W.alg) return !1;
    if (Q && W.alg !== Q) return !1;
    return !0;
  } catch {
    return !1;
  }
}
function PV(X, Q) {
  if ((Q === "v4" || !Q) && OV.test(X)) return !0;
  if ((Q === "v6" || !Q) && wV.test(X)) return !0;
  return !1;
}
class w1 extends d {
  _parse(X) {
    if (this._def.coerce) X.data = String(X.data);
    if (this._getType(X) !== I.string) {
      let W = this._getOrReturnCtx(X);
      return (
        b(W, {
          code: A.invalid_type,
          expected: I.string,
          received: W.parsedType,
        }),
        g
      );
    }
    let $ = new b0(),
      Y = void 0;
    for (let W of this._def.checks)
      if (W.kind === "min") {
        if (X.data.length < W.value)
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.too_small,
              minimum: W.value,
              type: "string",
              inclusive: !0,
              exact: !1,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "max") {
        if (X.data.length > W.value)
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.too_big,
              maximum: W.value,
              type: "string",
              inclusive: !0,
              exact: !1,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "length") {
        let J = X.data.length > W.value,
          G = X.data.length < W.value;
        if (J || G) {
          if (((Y = this._getOrReturnCtx(X, Y)), J))
            b(Y, {
              code: A.too_big,
              maximum: W.value,
              type: "string",
              inclusive: !0,
              exact: !0,
              message: W.message,
            });
          else if (G)
            b(Y, {
              code: A.too_small,
              minimum: W.value,
              type: "string",
              inclusive: !0,
              exact: !0,
              message: W.message,
            });
          $.dirty();
        }
      } else if (W.kind === "email") {
        if (!qV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "email",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "emoji") {
        if (!F9) F9 = new RegExp(FV, "u");
        if (!F9.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "emoji",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "uuid") {
        if (!KV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "uuid",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "nanoid") {
        if (!UV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "nanoid",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "cuid") {
        if (!HV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "cuid",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "cuid2") {
        if (!BV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "cuid2",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "ulid") {
        if (!zV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "ulid",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "url")
        try {
          new URL(X.data);
        } catch {
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "url",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
        }
      else if (W.kind === "regex") {
        if (((W.regex.lastIndex = 0), !W.regex.test(X.data)))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "regex",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "trim") X.data = X.data.trim();
      else if (W.kind === "includes") {
        if (!X.data.includes(W.value, W.position))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: { includes: W.value, position: W.position },
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "toLowerCase") X.data = X.data.toLowerCase();
      else if (W.kind === "toUpperCase") X.data = X.data.toUpperCase();
      else if (W.kind === "startsWith") {
        if (!X.data.startsWith(W.value))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: { startsWith: W.value },
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "endsWith") {
        if (!X.data.endsWith(W.value))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: { endsWith: W.value },
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "datetime") {
        if (!IV(W).test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: "datetime",
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "date") {
        if (!jV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: "date",
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "time") {
        if (!RV(W).test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.invalid_string,
              validation: "time",
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "duration") {
        if (!LV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "duration",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "ip") {
        if (!EV(X.data, W.version))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "ip",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "jwt") {
        if (!bV(X.data, W.alg))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "jwt",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "cidr") {
        if (!PV(X.data, W.version))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "cidr",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "base64") {
        if (!AV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "base64",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else if (W.kind === "base64url") {
        if (!MV.test(X.data))
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              validation: "base64url",
              code: A.invalid_string,
              message: W.message,
            }),
            $.dirty();
      } else n.assertNever(W);
    return { status: $.value, value: X.data };
  }
  _regex(X, Q, $) {
    return this.refinement((Y) => X.test(Y), {
      validation: Q,
      code: A.invalid_string,
      ...Z.errToObj($),
    });
  }
  _addCheck(X) {
    return new w1({ ...this._def, checks: [...this._def.checks, X] });
  }
  email(X) {
    return this._addCheck({ kind: "email", ...Z.errToObj(X) });
  }
  url(X) {
    return this._addCheck({ kind: "url", ...Z.errToObj(X) });
  }
  emoji(X) {
    return this._addCheck({ kind: "emoji", ...Z.errToObj(X) });
  }
  uuid(X) {
    return this._addCheck({ kind: "uuid", ...Z.errToObj(X) });
  }
  nanoid(X) {
    return this._addCheck({ kind: "nanoid", ...Z.errToObj(X) });
  }
  cuid(X) {
    return this._addCheck({ kind: "cuid", ...Z.errToObj(X) });
  }
  cuid2(X) {
    return this._addCheck({ kind: "cuid2", ...Z.errToObj(X) });
  }
  ulid(X) {
    return this._addCheck({ kind: "ulid", ...Z.errToObj(X) });
  }
  base64(X) {
    return this._addCheck({ kind: "base64", ...Z.errToObj(X) });
  }
  base64url(X) {
    return this._addCheck({ kind: "base64url", ...Z.errToObj(X) });
  }
  jwt(X) {
    return this._addCheck({ kind: "jwt", ...Z.errToObj(X) });
  }
  ip(X) {
    return this._addCheck({ kind: "ip", ...Z.errToObj(X) });
  }
  cidr(X) {
    return this._addCheck({ kind: "cidr", ...Z.errToObj(X) });
  }
  datetime(X) {
    if (typeof X === "string")
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: !1,
        local: !1,
        message: X,
      });
    return this._addCheck({
      kind: "datetime",
      precision: typeof X?.precision > "u" ? null : X?.precision,
      offset: X?.offset ?? !1,
      local: X?.local ?? !1,
      ...Z.errToObj(X?.message),
    });
  }
  date(X) {
    return this._addCheck({ kind: "date", message: X });
  }
  time(X) {
    if (typeof X === "string")
      return this._addCheck({ kind: "time", precision: null, message: X });
    return this._addCheck({
      kind: "time",
      precision: typeof X?.precision > "u" ? null : X?.precision,
      ...Z.errToObj(X?.message),
    });
  }
  duration(X) {
    return this._addCheck({ kind: "duration", ...Z.errToObj(X) });
  }
  regex(X, Q) {
    return this._addCheck({ kind: "regex", regex: X, ...Z.errToObj(Q) });
  }
  includes(X, Q) {
    return this._addCheck({
      kind: "includes",
      value: X,
      position: Q?.position,
      ...Z.errToObj(Q?.message),
    });
  }
  startsWith(X, Q) {
    return this._addCheck({ kind: "startsWith", value: X, ...Z.errToObj(Q) });
  }
  endsWith(X, Q) {
    return this._addCheck({ kind: "endsWith", value: X, ...Z.errToObj(Q) });
  }
  min(X, Q) {
    return this._addCheck({ kind: "min", value: X, ...Z.errToObj(Q) });
  }
  max(X, Q) {
    return this._addCheck({ kind: "max", value: X, ...Z.errToObj(Q) });
  }
  length(X, Q) {
    return this._addCheck({ kind: "length", value: X, ...Z.errToObj(Q) });
  }
  nonempty(X) {
    return this.min(1, Z.errToObj(X));
  }
  trim() {
    return new w1({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }],
    });
  }
  toLowerCase() {
    return new w1({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }],
    });
  }
  toUpperCase() {
    return new w1({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }],
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((X) => X.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((X) => X.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((X) => X.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((X) => X.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((X) => X.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((X) => X.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((X) => X.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((X) => X.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((X) => X.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((X) => X.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((X) => X.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((X) => X.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((X) => X.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((X) => X.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((X) => X.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((X) => X.kind === "base64url");
  }
  get minLength() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "min") {
        if (X === null || Q.value > X) X = Q.value;
      }
    return X;
  }
  get maxLength() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "max") {
        if (X === null || Q.value < X) X = Q.value;
      }
    return X;
  }
}
w1.create = (X) => {
  return new w1({
    checks: [],
    typeName: j.ZodString,
    coerce: X?.coerce ?? !1,
    ...l(X),
  });
};
function SV(X, Q) {
  let $ = (X.toString().split(".")[1] || "").length,
    Y = (Q.toString().split(".")[1] || "").length,
    W = $ > Y ? $ : Y,
    J = Number.parseInt(X.toFixed(W).replace(".", "")),
    G = Number.parseInt(Q.toFixed(W).replace(".", ""));
  return (J % G) / 10 ** W;
}
class I6 extends d {
  constructor() {
    super(...arguments);
    (this.min = this.gte), (this.max = this.lte), (this.step = this.multipleOf);
  }
  _parse(X) {
    if (this._def.coerce) X.data = Number(X.data);
    if (this._getType(X) !== I.number) {
      let W = this._getOrReturnCtx(X);
      return (
        b(W, {
          code: A.invalid_type,
          expected: I.number,
          received: W.parsedType,
        }),
        g
      );
    }
    let $ = void 0,
      Y = new b0();
    for (let W of this._def.checks)
      if (W.kind === "int") {
        if (!n.isInteger(X.data))
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.invalid_type,
              expected: "integer",
              received: "float",
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "min") {
        if (W.inclusive ? X.data < W.value : X.data <= W.value)
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.too_small,
              minimum: W.value,
              type: "number",
              inclusive: W.inclusive,
              exact: !1,
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "max") {
        if (W.inclusive ? X.data > W.value : X.data >= W.value)
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.too_big,
              maximum: W.value,
              type: "number",
              inclusive: W.inclusive,
              exact: !1,
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "multipleOf") {
        if (SV(X.data, W.value) !== 0)
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.not_multiple_of,
              multipleOf: W.value,
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "finite") {
        if (!Number.isFinite(X.data))
          ($ = this._getOrReturnCtx(X, $)),
            b($, { code: A.not_finite, message: W.message }),
            Y.dirty();
      } else n.assertNever(W);
    return { status: Y.value, value: X.data };
  }
  gte(X, Q) {
    return this.setLimit("min", X, !0, Z.toString(Q));
  }
  gt(X, Q) {
    return this.setLimit("min", X, !1, Z.toString(Q));
  }
  lte(X, Q) {
    return this.setLimit("max", X, !0, Z.toString(Q));
  }
  lt(X, Q) {
    return this.setLimit("max", X, !1, Z.toString(Q));
  }
  setLimit(X, Q, $, Y) {
    return new I6({
      ...this._def,
      checks: [
        ...this._def.checks,
        { kind: X, value: Q, inclusive: $, message: Z.toString(Y) },
      ],
    });
  }
  _addCheck(X) {
    return new I6({ ...this._def, checks: [...this._def.checks, X] });
  }
  int(X) {
    return this._addCheck({ kind: "int", message: Z.toString(X) });
  }
  positive(X) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: Z.toString(X),
    });
  }
  negative(X) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: Z.toString(X),
    });
  }
  nonpositive(X) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: Z.toString(X),
    });
  }
  nonnegative(X) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: Z.toString(X),
    });
  }
  multipleOf(X, Q) {
    return this._addCheck({
      kind: "multipleOf",
      value: X,
      message: Z.toString(Q),
    });
  }
  finite(X) {
    return this._addCheck({ kind: "finite", message: Z.toString(X) });
  }
  safe(X) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: Z.toString(X),
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: Z.toString(X),
    });
  }
  get minValue() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "min") {
        if (X === null || Q.value > X) X = Q.value;
      }
    return X;
  }
  get maxValue() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "max") {
        if (X === null || Q.value < X) X = Q.value;
      }
    return X;
  }
  get isInt() {
    return !!this._def.checks.find(
      (X) =>
        X.kind === "int" || (X.kind === "multipleOf" && n.isInteger(X.value))
    );
  }
  get isFinite() {
    let X = null,
      Q = null;
    for (let $ of this._def.checks)
      if ($.kind === "finite" || $.kind === "int" || $.kind === "multipleOf")
        return !0;
      else if ($.kind === "min") {
        if (Q === null || $.value > Q) Q = $.value;
      } else if ($.kind === "max") {
        if (X === null || $.value < X) X = $.value;
      }
    return Number.isFinite(Q) && Number.isFinite(X);
  }
}
I6.create = (X) => {
  return new I6({
    checks: [],
    typeName: j.ZodNumber,
    coerce: X?.coerce || !1,
    ...l(X),
  });
};
class E6 extends d {
  constructor() {
    super(...arguments);
    (this.min = this.gte), (this.max = this.lte);
  }
  _parse(X) {
    if (this._def.coerce)
      try {
        X.data = BigInt(X.data);
      } catch {
        return this._getInvalidInput(X);
      }
    if (this._getType(X) !== I.bigint) return this._getInvalidInput(X);
    let $ = void 0,
      Y = new b0();
    for (let W of this._def.checks)
      if (W.kind === "min") {
        if (W.inclusive ? X.data < W.value : X.data <= W.value)
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.too_small,
              type: "bigint",
              minimum: W.value,
              inclusive: W.inclusive,
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "max") {
        if (W.inclusive ? X.data > W.value : X.data >= W.value)
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.too_big,
              type: "bigint",
              maximum: W.value,
              inclusive: W.inclusive,
              message: W.message,
            }),
            Y.dirty();
      } else if (W.kind === "multipleOf") {
        if (X.data % W.value !== BigInt(0))
          ($ = this._getOrReturnCtx(X, $)),
            b($, {
              code: A.not_multiple_of,
              multipleOf: W.value,
              message: W.message,
            }),
            Y.dirty();
      } else n.assertNever(W);
    return { status: Y.value, value: X.data };
  }
  _getInvalidInput(X) {
    let Q = this._getOrReturnCtx(X);
    return (
      b(Q, {
        code: A.invalid_type,
        expected: I.bigint,
        received: Q.parsedType,
      }),
      g
    );
  }
  gte(X, Q) {
    return this.setLimit("min", X, !0, Z.toString(Q));
  }
  gt(X, Q) {
    return this.setLimit("min", X, !1, Z.toString(Q));
  }
  lte(X, Q) {
    return this.setLimit("max", X, !0, Z.toString(Q));
  }
  lt(X, Q) {
    return this.setLimit("max", X, !1, Z.toString(Q));
  }
  setLimit(X, Q, $, Y) {
    return new E6({
      ...this._def,
      checks: [
        ...this._def.checks,
        { kind: X, value: Q, inclusive: $, message: Z.toString(Y) },
      ],
    });
  }
  _addCheck(X) {
    return new E6({ ...this._def, checks: [...this._def.checks, X] });
  }
  positive(X) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: Z.toString(X),
    });
  }
  negative(X) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: Z.toString(X),
    });
  }
  nonpositive(X) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: Z.toString(X),
    });
  }
  nonnegative(X) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: Z.toString(X),
    });
  }
  multipleOf(X, Q) {
    return this._addCheck({
      kind: "multipleOf",
      value: X,
      message: Z.toString(Q),
    });
  }
  get minValue() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "min") {
        if (X === null || Q.value > X) X = Q.value;
      }
    return X;
  }
  get maxValue() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "max") {
        if (X === null || Q.value < X) X = Q.value;
      }
    return X;
  }
}
E6.create = (X) => {
  return new E6({
    checks: [],
    typeName: j.ZodBigInt,
    coerce: X?.coerce ?? !1,
    ...l(X),
  });
};
class O4 extends d {
  _parse(X) {
    if (this._def.coerce) X.data = Boolean(X.data);
    if (this._getType(X) !== I.boolean) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, {
          code: A.invalid_type,
          expected: I.boolean,
          received: $.parsedType,
        }),
        g
      );
    }
    return C0(X.data);
  }
}
O4.create = (X) => {
  return new O4({ typeName: j.ZodBoolean, coerce: X?.coerce || !1, ...l(X) });
};
class GX extends d {
  _parse(X) {
    if (this._def.coerce) X.data = new Date(X.data);
    if (this._getType(X) !== I.date) {
      let W = this._getOrReturnCtx(X);
      return (
        b(W, {
          code: A.invalid_type,
          expected: I.date,
          received: W.parsedType,
        }),
        g
      );
    }
    if (Number.isNaN(X.data.getTime())) {
      let W = this._getOrReturnCtx(X);
      return b(W, { code: A.invalid_date }), g;
    }
    let $ = new b0(),
      Y = void 0;
    for (let W of this._def.checks)
      if (W.kind === "min") {
        if (X.data.getTime() < W.value)
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.too_small,
              message: W.message,
              inclusive: !0,
              exact: !1,
              minimum: W.value,
              type: "date",
            }),
            $.dirty();
      } else if (W.kind === "max") {
        if (X.data.getTime() > W.value)
          (Y = this._getOrReturnCtx(X, Y)),
            b(Y, {
              code: A.too_big,
              message: W.message,
              inclusive: !0,
              exact: !1,
              maximum: W.value,
              type: "date",
            }),
            $.dirty();
      } else n.assertNever(W);
    return { status: $.value, value: new Date(X.data.getTime()) };
  }
  _addCheck(X) {
    return new GX({ ...this._def, checks: [...this._def.checks, X] });
  }
  min(X, Q) {
    return this._addCheck({
      kind: "min",
      value: X.getTime(),
      message: Z.toString(Q),
    });
  }
  max(X, Q) {
    return this._addCheck({
      kind: "max",
      value: X.getTime(),
      message: Z.toString(Q),
    });
  }
  get minDate() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "min") {
        if (X === null || Q.value > X) X = Q.value;
      }
    return X != null ? new Date(X) : null;
  }
  get maxDate() {
    let X = null;
    for (let Q of this._def.checks)
      if (Q.kind === "max") {
        if (X === null || Q.value < X) X = Q.value;
      }
    return X != null ? new Date(X) : null;
  }
}
GX.create = (X) => {
  return new GX({
    checks: [],
    coerce: X?.coerce || !1,
    typeName: j.ZodDate,
    ...l(X),
  });
};
class D4 extends d {
  _parse(X) {
    if (this._getType(X) !== I.symbol) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, {
          code: A.invalid_type,
          expected: I.symbol,
          received: $.parsedType,
        }),
        g
      );
    }
    return C0(X.data);
  }
}
D4.create = (X) => {
  return new D4({ typeName: j.ZodSymbol, ...l(X) });
};
class HX extends d {
  _parse(X) {
    if (this._getType(X) !== I.undefined) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, {
          code: A.invalid_type,
          expected: I.undefined,
          received: $.parsedType,
        }),
        g
      );
    }
    return C0(X.data);
  }
}
HX.create = (X) => {
  return new HX({ typeName: j.ZodUndefined, ...l(X) });
};
class BX extends d {
  _parse(X) {
    if (this._getType(X) !== I.null) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, {
          code: A.invalid_type,
          expected: I.null,
          received: $.parsedType,
        }),
        g
      );
    }
    return C0(X.data);
  }
}
BX.create = (X) => {
  return new BX({ typeName: j.ZodNull, ...l(X) });
};
class w4 extends d {
  constructor() {
    super(...arguments);
    this._any = !0;
  }
  _parse(X) {
    return C0(X.data);
  }
}
w4.create = (X) => {
  return new w4({ typeName: j.ZodAny, ...l(X) });
};
class a1 extends d {
  constructor() {
    super(...arguments);
    this._unknown = !0;
  }
  _parse(X) {
    return C0(X.data);
  }
}
a1.create = (X) => {
  return new a1({ typeName: j.ZodUnknown, ...l(X) });
};
class A1 extends d {
  _parse(X) {
    let Q = this._getOrReturnCtx(X);
    return (
      b(Q, { code: A.invalid_type, expected: I.never, received: Q.parsedType }),
      g
    );
  }
}
A1.create = (X) => {
  return new A1({ typeName: j.ZodNever, ...l(X) });
};
class A4 extends d {
  _parse(X) {
    if (this._getType(X) !== I.undefined) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, {
          code: A.invalid_type,
          expected: I.void,
          received: $.parsedType,
        }),
        g
      );
    }
    return C0(X.data);
  }
}
A4.create = (X) => {
  return new A4({ typeName: j.ZodVoid, ...l(X) });
};
class W1 extends d {
  _parse(X) {
    let { ctx: Q, status: $ } = this._processInputParams(X),
      Y = this._def;
    if (Q.parsedType !== I.array)
      return (
        b(Q, {
          code: A.invalid_type,
          expected: I.array,
          received: Q.parsedType,
        }),
        g
      );
    if (Y.exactLength !== null) {
      let J = Q.data.length > Y.exactLength.value,
        G = Q.data.length < Y.exactLength.value;
      if (J || G)
        b(Q, {
          code: J ? A.too_big : A.too_small,
          minimum: G ? Y.exactLength.value : void 0,
          maximum: J ? Y.exactLength.value : void 0,
          type: "array",
          inclusive: !0,
          exact: !0,
          message: Y.exactLength.message,
        }),
          $.dirty();
    }
    if (Y.minLength !== null) {
      if (Q.data.length < Y.minLength.value)
        b(Q, {
          code: A.too_small,
          minimum: Y.minLength.value,
          type: "array",
          inclusive: !0,
          exact: !1,
          message: Y.minLength.message,
        }),
          $.dirty();
    }
    if (Y.maxLength !== null) {
      if (Q.data.length > Y.maxLength.value)
        b(Q, {
          code: A.too_big,
          maximum: Y.maxLength.value,
          type: "array",
          inclusive: !0,
          exact: !1,
          message: Y.maxLength.message,
        }),
          $.dirty();
    }
    if (Q.common.async)
      return Promise.all(
        [...Q.data].map((J, G) => {
          return Y.type._parseAsync(new r0(Q, J, Q.path, G));
        })
      ).then((J) => {
        return b0.mergeArray($, J);
      });
    let W = [...Q.data].map((J, G) => {
      return Y.type._parseSync(new r0(Q, J, Q.path, G));
    });
    return b0.mergeArray($, W);
  }
  get element() {
    return this._def.type;
  }
  min(X, Q) {
    return new W1({
      ...this._def,
      minLength: { value: X, message: Z.toString(Q) },
    });
  }
  max(X, Q) {
    return new W1({
      ...this._def,
      maxLength: { value: X, message: Z.toString(Q) },
    });
  }
  length(X, Q) {
    return new W1({
      ...this._def,
      exactLength: { value: X, message: Z.toString(Q) },
    });
  }
  nonempty(X) {
    return this.min(1, X);
  }
}
W1.create = (X, Q) => {
  return new W1({
    type: X,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: j.ZodArray,
    ...l(Q),
  });
};
function R6(X) {
  if (X instanceof V0) {
    let Q = {};
    for (let $ in X.shape) {
      let Y = X.shape[$];
      Q[$] = J1.create(R6(Y));
    }
    return new V0({ ...X._def, shape: () => Q });
  } else if (X instanceof W1) return new W1({ ...X._def, type: R6(X.element) });
  else if (X instanceof J1) return J1.create(R6(X.unwrap()));
  else if (X instanceof _1) return _1.create(R6(X.unwrap()));
  else if (X instanceof M1) return M1.create(X.items.map((Q) => R6(Q)));
  else return X;
}
class V0 extends d {
  constructor() {
    super(...arguments);
    (this._cached = null),
      (this.nonstrict = this.passthrough),
      (this.augment = this.extend);
  }
  _getCached() {
    if (this._cached !== null) return this._cached;
    let X = this._def.shape(),
      Q = n.objectKeys(X);
    return (this._cached = { shape: X, keys: Q }), this._cached;
  }
  _parse(X) {
    if (this._getType(X) !== I.object) {
      let B = this._getOrReturnCtx(X);
      return (
        b(B, {
          code: A.invalid_type,
          expected: I.object,
          received: B.parsedType,
        }),
        g
      );
    }
    let { status: $, ctx: Y } = this._processInputParams(X),
      { shape: W, keys: J } = this._getCached(),
      G = [];
    if (
      !(this._def.catchall instanceof A1 && this._def.unknownKeys === "strip")
    ) {
      for (let B in Y.data) if (!J.includes(B)) G.push(B);
    }
    let H = [];
    for (let B of J) {
      let z = W[B],
        K = Y.data[B];
      H.push({
        key: { status: "valid", value: B },
        value: z._parse(new r0(Y, K, Y.path, B)),
        alwaysSet: B in Y.data,
      });
    }
    if (this._def.catchall instanceof A1) {
      let B = this._def.unknownKeys;
      if (B === "passthrough")
        for (let z of G)
          H.push({
            key: { status: "valid", value: z },
            value: { status: "valid", value: Y.data[z] },
          });
      else if (B === "strict") {
        if (G.length > 0)
          b(Y, { code: A.unrecognized_keys, keys: G }), $.dirty();
      } else if (B === "strip");
      else throw Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      let B = this._def.catchall;
      for (let z of G) {
        let K = Y.data[z];
        H.push({
          key: { status: "valid", value: z },
          value: B._parse(new r0(Y, K, Y.path, z)),
          alwaysSet: z in Y.data,
        });
      }
    }
    if (Y.common.async)
      return Promise.resolve()
        .then(async () => {
          let B = [];
          for (let z of H) {
            let K = await z.key,
              V = await z.value;
            B.push({ key: K, value: V, alwaysSet: z.alwaysSet });
          }
          return B;
        })
        .then((B) => {
          return b0.mergeObjectSync($, B);
        });
    else return b0.mergeObjectSync($, H);
  }
  get shape() {
    return this._def.shape();
  }
  strict(X) {
    return (
      Z.errToObj,
      new V0({
        ...this._def,
        unknownKeys: "strict",
        ...(X !== void 0
          ? {
              errorMap: (Q, $) => {
                let Y = this._def.errorMap?.(Q, $).message ?? $.defaultError;
                if (Q.code === "unrecognized_keys")
                  return { message: Z.errToObj(X).message ?? Y };
                return { message: Y };
              },
            }
          : {}),
      })
    );
  }
  strip() {
    return new V0({ ...this._def, unknownKeys: "strip" });
  }
  passthrough() {
    return new V0({ ...this._def, unknownKeys: "passthrough" });
  }
  extend(X) {
    return new V0({
      ...this._def,
      shape: () => ({ ...this._def.shape(), ...X }),
    });
  }
  merge(X) {
    return new V0({
      unknownKeys: X._def.unknownKeys,
      catchall: X._def.catchall,
      shape: () => ({ ...this._def.shape(), ...X._def.shape() }),
      typeName: j.ZodObject,
    });
  }
  setKey(X, Q) {
    return this.augment({ [X]: Q });
  }
  catchall(X) {
    return new V0({ ...this._def, catchall: X });
  }
  pick(X) {
    let Q = {};
    for (let $ of n.objectKeys(X))
      if (X[$] && this.shape[$]) Q[$] = this.shape[$];
    return new V0({ ...this._def, shape: () => Q });
  }
  omit(X) {
    let Q = {};
    for (let $ of n.objectKeys(this.shape)) if (!X[$]) Q[$] = this.shape[$];
    return new V0({ ...this._def, shape: () => Q });
  }
  deepPartial() {
    return R6(this);
  }
  partial(X) {
    let Q = {};
    for (let $ of n.objectKeys(this.shape)) {
      let Y = this.shape[$];
      if (X && !X[$]) Q[$] = Y;
      else Q[$] = Y.optional();
    }
    return new V0({ ...this._def, shape: () => Q });
  }
  required(X) {
    let Q = {};
    for (let $ of n.objectKeys(this.shape))
      if (X && !X[$]) Q[$] = this.shape[$];
      else {
        let W = this.shape[$];
        while (W instanceof J1) W = W._def.innerType;
        Q[$] = W;
      }
    return new V0({ ...this._def, shape: () => Q });
  }
  keyof() {
    return NW(n.objectKeys(this.shape));
  }
}
V0.create = (X, Q) => {
  return new V0({
    shape: () => X,
    unknownKeys: "strip",
    catchall: A1.create(),
    typeName: j.ZodObject,
    ...l(Q),
  });
};
V0.strictCreate = (X, Q) => {
  return new V0({
    shape: () => X,
    unknownKeys: "strict",
    catchall: A1.create(),
    typeName: j.ZodObject,
    ...l(Q),
  });
};
V0.lazycreate = (X, Q) => {
  return new V0({
    shape: X,
    unknownKeys: "strip",
    catchall: A1.create(),
    typeName: j.ZodObject,
    ...l(Q),
  });
};
class zX extends d {
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X),
      $ = this._def.options;
    function Y(W) {
      for (let G of W) if (G.result.status === "valid") return G.result;
      for (let G of W)
        if (G.result.status === "dirty")
          return Q.common.issues.push(...G.ctx.common.issues), G.result;
      let J = W.map((G) => new h0(G.ctx.common.issues));
      return b(Q, { code: A.invalid_union, unionErrors: J }), g;
    }
    if (Q.common.async)
      return Promise.all(
        $.map(async (W) => {
          let J = { ...Q, common: { ...Q.common, issues: [] }, parent: null };
          return {
            result: await W._parseAsync({
              data: Q.data,
              path: Q.path,
              parent: J,
            }),
            ctx: J,
          };
        })
      ).then(Y);
    else {
      let W = void 0,
        J = [];
      for (let H of $) {
        let B = { ...Q, common: { ...Q.common, issues: [] }, parent: null },
          z = H._parseSync({ data: Q.data, path: Q.path, parent: B });
        if (z.status === "valid") return z;
        else if (z.status === "dirty" && !W) W = { result: z, ctx: B };
        if (B.common.issues.length) J.push(B.common.issues);
      }
      if (W) return Q.common.issues.push(...W.ctx.common.issues), W.result;
      let G = J.map((H) => new h0(H));
      return b(Q, { code: A.invalid_union, unionErrors: G }), g;
    }
  }
  get options() {
    return this._def.options;
  }
}
zX.create = (X, Q) => {
  return new zX({ options: X, typeName: j.ZodUnion, ...l(Q) });
};
var D1 = (X) => {
  if (X instanceof UX) return D1(X.schema);
  else if (X instanceof G1) return D1(X.innerType());
  else if (X instanceof VX) return [X.value];
  else if (X instanceof s1) return X.options;
  else if (X instanceof LX) return n.objectValues(X.enum);
  else if (X instanceof qX) return D1(X._def.innerType);
  else if (X instanceof HX) return [void 0];
  else if (X instanceof BX) return [null];
  else if (X instanceof J1) return [void 0, ...D1(X.unwrap())];
  else if (X instanceof _1) return [null, ...D1(X.unwrap())];
  else if (X instanceof D9) return D1(X.unwrap());
  else if (X instanceof NX) return D1(X.unwrap());
  else if (X instanceof FX) return D1(X._def.innerType);
  else return [];
};
class O9 extends d {
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X);
    if (Q.parsedType !== I.object)
      return (
        b(Q, {
          code: A.invalid_type,
          expected: I.object,
          received: Q.parsedType,
        }),
        g
      );
    let $ = this.discriminator,
      Y = Q.data[$],
      W = this.optionsMap.get(Y);
    if (!W)
      return (
        b(Q, {
          code: A.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [$],
        }),
        g
      );
    if (Q.common.async)
      return W._parseAsync({ data: Q.data, path: Q.path, parent: Q });
    else return W._parseSync({ data: Q.data, path: Q.path, parent: Q });
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(X, Q, $) {
    let Y = new Map();
    for (let W of Q) {
      let J = D1(W.shape[X]);
      if (!J.length)
        throw Error(
          `A discriminator value for key \`${X}\` could not be extracted from all schema options`
        );
      for (let G of J) {
        if (Y.has(G))
          throw Error(
            `Discriminator property ${String(X)} has duplicate value ${String(
              G
            )}`
          );
        Y.set(G, W);
      }
    }
    return new O9({
      typeName: j.ZodDiscriminatedUnion,
      discriminator: X,
      options: Q,
      optionsMap: Y,
      ...l($),
    });
  }
}
function N9(X, Q) {
  let $ = O1(X),
    Y = O1(Q);
  if (X === Q) return { valid: !0, data: X };
  else if ($ === I.object && Y === I.object) {
    let W = n.objectKeys(Q),
      J = n.objectKeys(X).filter((H) => W.indexOf(H) !== -1),
      G = { ...X, ...Q };
    for (let H of J) {
      let B = N9(X[H], Q[H]);
      if (!B.valid) return { valid: !1 };
      G[H] = B.data;
    }
    return { valid: !0, data: G };
  } else if ($ === I.array && Y === I.array) {
    if (X.length !== Q.length) return { valid: !1 };
    let W = [];
    for (let J = 0; J < X.length; J++) {
      let G = X[J],
        H = Q[J],
        B = N9(G, H);
      if (!B.valid) return { valid: !1 };
      W.push(B.data);
    }
    return { valid: !0, data: W };
  } else if ($ === I.date && Y === I.date && +X === +Q)
    return { valid: !0, data: X };
  else return { valid: !1 };
}
class KX extends d {
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X),
      Y = (W, J) => {
        if (L9(W) || L9(J)) return g;
        let G = N9(W.value, J.value);
        if (!G.valid) return b($, { code: A.invalid_intersection_types }), g;
        if (q9(W) || q9(J)) Q.dirty();
        return { status: Q.value, value: G.data };
      };
    if ($.common.async)
      return Promise.all([
        this._def.left._parseAsync({ data: $.data, path: $.path, parent: $ }),
        this._def.right._parseAsync({ data: $.data, path: $.path, parent: $ }),
      ]).then(([W, J]) => Y(W, J));
    else
      return Y(
        this._def.left._parseSync({ data: $.data, path: $.path, parent: $ }),
        this._def.right._parseSync({ data: $.data, path: $.path, parent: $ })
      );
  }
}
KX.create = (X, Q, $) => {
  return new KX({ left: X, right: Q, typeName: j.ZodIntersection, ...l($) });
};
class M1 extends d {
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X);
    if ($.parsedType !== I.array)
      return (
        b($, {
          code: A.invalid_type,
          expected: I.array,
          received: $.parsedType,
        }),
        g
      );
    if ($.data.length < this._def.items.length)
      return (
        b($, {
          code: A.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: "array",
        }),
        g
      );
    if (!this._def.rest && $.data.length > this._def.items.length)
      b($, {
        code: A.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array",
      }),
        Q.dirty();
    let W = [...$.data]
      .map((J, G) => {
        let H = this._def.items[G] || this._def.rest;
        if (!H) return null;
        return H._parse(new r0($, J, $.path, G));
      })
      .filter((J) => !!J);
    if ($.common.async)
      return Promise.all(W).then((J) => {
        return b0.mergeArray(Q, J);
      });
    else return b0.mergeArray(Q, W);
  }
  get items() {
    return this._def.items;
  }
  rest(X) {
    return new M1({ ...this._def, rest: X });
  }
}
M1.create = (X, Q) => {
  if (!Array.isArray(X))
    throw Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new M1({ items: X, typeName: j.ZodTuple, rest: null, ...l(Q) });
};
class M4 extends d {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X);
    if ($.parsedType !== I.object)
      return (
        b($, {
          code: A.invalid_type,
          expected: I.object,
          received: $.parsedType,
        }),
        g
      );
    let Y = [],
      W = this._def.keyType,
      J = this._def.valueType;
    for (let G in $.data)
      Y.push({
        key: W._parse(new r0($, G, $.path, G)),
        value: J._parse(new r0($, $.data[G], $.path, G)),
        alwaysSet: G in $.data,
      });
    if ($.common.async) return b0.mergeObjectAsync(Q, Y);
    else return b0.mergeObjectSync(Q, Y);
  }
  get element() {
    return this._def.valueType;
  }
  static create(X, Q, $) {
    if (Q instanceof d)
      return new M4({
        keyType: X,
        valueType: Q,
        typeName: j.ZodRecord,
        ...l($),
      });
    return new M4({
      keyType: w1.create(),
      valueType: X,
      typeName: j.ZodRecord,
      ...l(Q),
    });
  }
}
class j4 extends d {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X);
    if ($.parsedType !== I.map)
      return (
        b($, { code: A.invalid_type, expected: I.map, received: $.parsedType }),
        g
      );
    let Y = this._def.keyType,
      W = this._def.valueType,
      J = [...$.data.entries()].map(([G, H], B) => {
        return {
          key: Y._parse(new r0($, G, $.path, [B, "key"])),
          value: W._parse(new r0($, H, $.path, [B, "value"])),
        };
      });
    if ($.common.async) {
      let G = new Map();
      return Promise.resolve().then(async () => {
        for (let H of J) {
          let B = await H.key,
            z = await H.value;
          if (B.status === "aborted" || z.status === "aborted") return g;
          if (B.status === "dirty" || z.status === "dirty") Q.dirty();
          G.set(B.value, z.value);
        }
        return { status: Q.value, value: G };
      });
    } else {
      let G = new Map();
      for (let H of J) {
        let { key: B, value: z } = H;
        if (B.status === "aborted" || z.status === "aborted") return g;
        if (B.status === "dirty" || z.status === "dirty") Q.dirty();
        G.set(B.value, z.value);
      }
      return { status: Q.value, value: G };
    }
  }
}
j4.create = (X, Q, $) => {
  return new j4({ valueType: Q, keyType: X, typeName: j.ZodMap, ...l($) });
};
class b6 extends d {
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X);
    if ($.parsedType !== I.set)
      return (
        b($, { code: A.invalid_type, expected: I.set, received: $.parsedType }),
        g
      );
    let Y = this._def;
    if (Y.minSize !== null) {
      if ($.data.size < Y.minSize.value)
        b($, {
          code: A.too_small,
          minimum: Y.minSize.value,
          type: "set",
          inclusive: !0,
          exact: !1,
          message: Y.minSize.message,
        }),
          Q.dirty();
    }
    if (Y.maxSize !== null) {
      if ($.data.size > Y.maxSize.value)
        b($, {
          code: A.too_big,
          maximum: Y.maxSize.value,
          type: "set",
          inclusive: !0,
          exact: !1,
          message: Y.maxSize.message,
        }),
          Q.dirty();
    }
    let W = this._def.valueType;
    function J(H) {
      let B = new Set();
      for (let z of H) {
        if (z.status === "aborted") return g;
        if (z.status === "dirty") Q.dirty();
        B.add(z.value);
      }
      return { status: Q.value, value: B };
    }
    let G = [...$.data.values()].map((H, B) =>
      W._parse(new r0($, H, $.path, B))
    );
    if ($.common.async) return Promise.all(G).then((H) => J(H));
    else return J(G);
  }
  min(X, Q) {
    return new b6({
      ...this._def,
      minSize: { value: X, message: Z.toString(Q) },
    });
  }
  max(X, Q) {
    return new b6({
      ...this._def,
      maxSize: { value: X, message: Z.toString(Q) },
    });
  }
  size(X, Q) {
    return this.min(X, Q).max(X, Q);
  }
  nonempty(X) {
    return this.min(1, X);
  }
}
b6.create = (X, Q) => {
  return new b6({
    valueType: X,
    minSize: null,
    maxSize: null,
    typeName: j.ZodSet,
    ...l(Q),
  });
};
class JX extends d {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X);
    if (Q.parsedType !== I.function)
      return (
        b(Q, {
          code: A.invalid_type,
          expected: I.function,
          received: Q.parsedType,
        }),
        g
      );
    function $(G, H) {
      return N4({
        data: G,
        path: Q.path,
        errorMaps: [
          Q.common.contextualErrorMap,
          Q.schemaErrorMap,
          YX(),
          T1,
        ].filter((B) => !!B),
        issueData: { code: A.invalid_arguments, argumentsError: H },
      });
    }
    function Y(G, H) {
      return N4({
        data: G,
        path: Q.path,
        errorMaps: [
          Q.common.contextualErrorMap,
          Q.schemaErrorMap,
          YX(),
          T1,
        ].filter((B) => !!B),
        issueData: { code: A.invalid_return_type, returnTypeError: H },
      });
    }
    let W = { errorMap: Q.common.contextualErrorMap },
      J = Q.data;
    if (this._def.returns instanceof P6) {
      let G = this;
      return C0(async function (...H) {
        let B = new h0([]),
          z = await G._def.args.parseAsync(H, W).catch((L) => {
            throw (B.addIssue($(H, L)), B);
          }),
          K = await Reflect.apply(J, this, z);
        return await G._def.returns._def.type.parseAsync(K, W).catch((L) => {
          throw (B.addIssue(Y(K, L)), B);
        });
      });
    } else {
      let G = this;
      return C0(function (...H) {
        let B = G._def.args.safeParse(H, W);
        if (!B.success) throw new h0([$(H, B.error)]);
        let z = Reflect.apply(J, this, B.data),
          K = G._def.returns.safeParse(z, W);
        if (!K.success) throw new h0([Y(z, K.error)]);
        return K.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...X) {
    return new JX({ ...this._def, args: M1.create(X).rest(a1.create()) });
  }
  returns(X) {
    return new JX({ ...this._def, returns: X });
  }
  implement(X) {
    return this.parse(X);
  }
  strictImplement(X) {
    return this.parse(X);
  }
  static create(X, Q, $) {
    return new JX({
      args: X ? X : M1.create([]).rest(a1.create()),
      returns: Q || a1.create(),
      typeName: j.ZodFunction,
      ...l($),
    });
  }
}
class UX extends d {
  get schema() {
    return this._def.getter();
  }
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X);
    return this._def.getter()._parse({ data: Q.data, path: Q.path, parent: Q });
  }
}
UX.create = (X, Q) => {
  return new UX({ getter: X, typeName: j.ZodLazy, ...l(Q) });
};
class VX extends d {
  _parse(X) {
    if (X.data !== this._def.value) {
      let Q = this._getOrReturnCtx(X);
      return (
        b(Q, {
          received: Q.data,
          code: A.invalid_literal,
          expected: this._def.value,
        }),
        g
      );
    }
    return { status: "valid", value: X.data };
  }
  get value() {
    return this._def.value;
  }
}
VX.create = (X, Q) => {
  return new VX({ value: X, typeName: j.ZodLiteral, ...l(Q) });
};
function NW(X, Q) {
  return new s1({ values: X, typeName: j.ZodEnum, ...l(Q) });
}
class s1 extends d {
  _parse(X) {
    if (typeof X.data !== "string") {
      let Q = this._getOrReturnCtx(X),
        $ = this._def.values;
      return (
        b(Q, {
          expected: n.joinValues($),
          received: Q.parsedType,
          code: A.invalid_type,
        }),
        g
      );
    }
    if (!this._cache) this._cache = new Set(this._def.values);
    if (!this._cache.has(X.data)) {
      let Q = this._getOrReturnCtx(X),
        $ = this._def.values;
      return (
        b(Q, { received: Q.data, code: A.invalid_enum_value, options: $ }), g
      );
    }
    return C0(X.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    let X = {};
    for (let Q of this._def.values) X[Q] = Q;
    return X;
  }
  get Values() {
    let X = {};
    for (let Q of this._def.values) X[Q] = Q;
    return X;
  }
  get Enum() {
    let X = {};
    for (let Q of this._def.values) X[Q] = Q;
    return X;
  }
  extract(X, Q = this._def) {
    return s1.create(X, { ...this._def, ...Q });
  }
  exclude(X, Q = this._def) {
    return s1.create(
      this.options.filter(($) => !X.includes($)),
      { ...this._def, ...Q }
    );
  }
}
s1.create = NW;
class LX extends d {
  _parse(X) {
    let Q = n.getValidEnumValues(this._def.values),
      $ = this._getOrReturnCtx(X);
    if ($.parsedType !== I.string && $.parsedType !== I.number) {
      let Y = n.objectValues(Q);
      return (
        b($, {
          expected: n.joinValues(Y),
          received: $.parsedType,
          code: A.invalid_type,
        }),
        g
      );
    }
    if (!this._cache)
      this._cache = new Set(n.getValidEnumValues(this._def.values));
    if (!this._cache.has(X.data)) {
      let Y = n.objectValues(Q);
      return (
        b($, { received: $.data, code: A.invalid_enum_value, options: Y }), g
      );
    }
    return C0(X.data);
  }
  get enum() {
    return this._def.values;
  }
}
LX.create = (X, Q) => {
  return new LX({ values: X, typeName: j.ZodNativeEnum, ...l(Q) });
};
class P6 extends d {
  unwrap() {
    return this._def.type;
  }
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X);
    if (Q.parsedType !== I.promise && Q.common.async === !1)
      return (
        b(Q, {
          code: A.invalid_type,
          expected: I.promise,
          received: Q.parsedType,
        }),
        g
      );
    let $ = Q.parsedType === I.promise ? Q.data : Promise.resolve(Q.data);
    return C0(
      $.then((Y) => {
        return this._def.type.parseAsync(Y, {
          path: Q.path,
          errorMap: Q.common.contextualErrorMap,
        });
      })
    );
  }
}
P6.create = (X, Q) => {
  return new P6({ type: X, typeName: j.ZodPromise, ...l(Q) });
};
class G1 extends d {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === j.ZodEffects
      ? this._def.schema.sourceType()
      : this._def.schema;
  }
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X),
      Y = this._def.effect || null,
      W = {
        addIssue: (J) => {
          if ((b($, J), J.fatal)) Q.abort();
          else Q.dirty();
        },
        get path() {
          return $.path;
        },
      };
    if (((W.addIssue = W.addIssue.bind(W)), Y.type === "preprocess")) {
      let J = Y.transform($.data, W);
      if ($.common.async)
        return Promise.resolve(J).then(async (G) => {
          if (Q.value === "aborted") return g;
          let H = await this._def.schema._parseAsync({
            data: G,
            path: $.path,
            parent: $,
          });
          if (H.status === "aborted") return g;
          if (H.status === "dirty") return j6(H.value);
          if (Q.value === "dirty") return j6(H.value);
          return H;
        });
      else {
        if (Q.value === "aborted") return g;
        let G = this._def.schema._parseSync({
          data: J,
          path: $.path,
          parent: $,
        });
        if (G.status === "aborted") return g;
        if (G.status === "dirty") return j6(G.value);
        if (Q.value === "dirty") return j6(G.value);
        return G;
      }
    }
    if (Y.type === "refinement") {
      let J = (G) => {
        let H = Y.refinement(G, W);
        if ($.common.async) return Promise.resolve(H);
        if (H instanceof Promise)
          throw Error(
            "Async refinement encountered during synchronous parse operation. Use .parseAsync instead."
          );
        return G;
      };
      if ($.common.async === !1) {
        let G = this._def.schema._parseSync({
          data: $.data,
          path: $.path,
          parent: $,
        });
        if (G.status === "aborted") return g;
        if (G.status === "dirty") Q.dirty();
        return J(G.value), { status: Q.value, value: G.value };
      } else
        return this._def.schema
          ._parseAsync({ data: $.data, path: $.path, parent: $ })
          .then((G) => {
            if (G.status === "aborted") return g;
            if (G.status === "dirty") Q.dirty();
            return J(G.value).then(() => {
              return { status: Q.value, value: G.value };
            });
          });
    }
    if (Y.type === "transform")
      if ($.common.async === !1) {
        let J = this._def.schema._parseSync({
          data: $.data,
          path: $.path,
          parent: $,
        });
        if (!t1(J)) return g;
        let G = Y.transform(J.value, W);
        if (G instanceof Promise)
          throw Error(
            "Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead."
          );
        return { status: Q.value, value: G };
      } else
        return this._def.schema
          ._parseAsync({ data: $.data, path: $.path, parent: $ })
          .then((J) => {
            if (!t1(J)) return g;
            return Promise.resolve(Y.transform(J.value, W)).then((G) => ({
              status: Q.value,
              value: G,
            }));
          });
    n.assertNever(Y);
  }
}
G1.create = (X, Q, $) => {
  return new G1({ schema: X, typeName: j.ZodEffects, effect: Q, ...l($) });
};
G1.createWithPreprocess = (X, Q, $) => {
  return new G1({
    schema: Q,
    effect: { type: "preprocess", transform: X },
    typeName: j.ZodEffects,
    ...l($),
  });
};
class J1 extends d {
  _parse(X) {
    if (this._getType(X) === I.undefined) return C0(void 0);
    return this._def.innerType._parse(X);
  }
  unwrap() {
    return this._def.innerType;
  }
}
J1.create = (X, Q) => {
  return new J1({ innerType: X, typeName: j.ZodOptional, ...l(Q) });
};
class _1 extends d {
  _parse(X) {
    if (this._getType(X) === I.null) return C0(null);
    return this._def.innerType._parse(X);
  }
  unwrap() {
    return this._def.innerType;
  }
}
_1.create = (X, Q) => {
  return new _1({ innerType: X, typeName: j.ZodNullable, ...l(Q) });
};
class qX extends d {
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X),
      $ = Q.data;
    if (Q.parsedType === I.undefined) $ = this._def.defaultValue();
    return this._def.innerType._parse({ data: $, path: Q.path, parent: Q });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
qX.create = (X, Q) => {
  return new qX({
    innerType: X,
    typeName: j.ZodDefault,
    defaultValue: typeof Q.default === "function" ? Q.default : () => Q.default,
    ...l(Q),
  });
};
class FX extends d {
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X),
      $ = { ...Q, common: { ...Q.common, issues: [] } },
      Y = this._def.innerType._parse({
        data: $.data,
        path: $.path,
        parent: { ...$ },
      });
    if (WX(Y))
      return Y.then((W) => {
        return {
          status: "valid",
          value:
            W.status === "valid"
              ? W.value
              : this._def.catchValue({
                  get error() {
                    return new h0($.common.issues);
                  },
                  input: $.data,
                }),
        };
      });
    else
      return {
        status: "valid",
        value:
          Y.status === "valid"
            ? Y.value
            : this._def.catchValue({
                get error() {
                  return new h0($.common.issues);
                },
                input: $.data,
              }),
      };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
FX.create = (X, Q) => {
  return new FX({
    innerType: X,
    typeName: j.ZodCatch,
    catchValue: typeof Q.catch === "function" ? Q.catch : () => Q.catch,
    ...l(Q),
  });
};
class R4 extends d {
  _parse(X) {
    if (this._getType(X) !== I.nan) {
      let $ = this._getOrReturnCtx(X);
      return (
        b($, { code: A.invalid_type, expected: I.nan, received: $.parsedType }),
        g
      );
    }
    return { status: "valid", value: X.data };
  }
}
R4.create = (X) => {
  return new R4({ typeName: j.ZodNaN, ...l(X) });
};
var M2 = Symbol("zod_brand");
class D9 extends d {
  _parse(X) {
    let { ctx: Q } = this._processInputParams(X),
      $ = Q.data;
    return this._def.type._parse({ data: $, path: Q.path, parent: Q });
  }
  unwrap() {
    return this._def.type;
  }
}
class I4 extends d {
  _parse(X) {
    let { status: Q, ctx: $ } = this._processInputParams(X);
    if ($.common.async)
      return (async () => {
        let W = await this._def.in._parseAsync({
          data: $.data,
          path: $.path,
          parent: $,
        });
        if (W.status === "aborted") return g;
        if (W.status === "dirty") return Q.dirty(), j6(W.value);
        else
          return this._def.out._parseAsync({
            data: W.value,
            path: $.path,
            parent: $,
          });
      })();
    else {
      let Y = this._def.in._parseSync({
        data: $.data,
        path: $.path,
        parent: $,
      });
      if (Y.status === "aborted") return g;
      if (Y.status === "dirty")
        return Q.dirty(), { status: "dirty", value: Y.value };
      else
        return this._def.out._parseSync({
          data: Y.value,
          path: $.path,
          parent: $,
        });
    }
  }
  static create(X, Q) {
    return new I4({ in: X, out: Q, typeName: j.ZodPipeline });
  }
}
class NX extends d {
  _parse(X) {
    let Q = this._def.innerType._parse(X),
      $ = (Y) => {
        if (t1(Y)) Y.value = Object.freeze(Y.value);
        return Y;
      };
    return WX(Q) ? Q.then((Y) => $(Y)) : $(Q);
  }
  unwrap() {
    return this._def.innerType;
  }
}
NX.create = (X, Q) => {
  return new NX({ innerType: X, typeName: j.ZodReadonly, ...l(Q) });
};
var j2 = { object: V0.lazycreate },
  j;
(function (X) {
  (X.ZodString = "ZodString"),
    (X.ZodNumber = "ZodNumber"),
    (X.ZodNaN = "ZodNaN"),
    (X.ZodBigInt = "ZodBigInt"),
    (X.ZodBoolean = "ZodBoolean"),
    (X.ZodDate = "ZodDate"),
    (X.ZodSymbol = "ZodSymbol"),
    (X.ZodUndefined = "ZodUndefined"),
    (X.ZodNull = "ZodNull"),
    (X.ZodAny = "ZodAny"),
    (X.ZodUnknown = "ZodUnknown"),
    (X.ZodNever = "ZodNever"),
    (X.ZodVoid = "ZodVoid"),
    (X.ZodArray = "ZodArray"),
    (X.ZodObject = "ZodObject"),
    (X.ZodUnion = "ZodUnion"),
    (X.ZodDiscriminatedUnion = "ZodDiscriminatedUnion"),
    (X.ZodIntersection = "ZodIntersection"),
    (X.ZodTuple = "ZodTuple"),
    (X.ZodRecord = "ZodRecord"),
    (X.ZodMap = "ZodMap"),
    (X.ZodSet = "ZodSet"),
    (X.ZodFunction = "ZodFunction"),
    (X.ZodLazy = "ZodLazy"),
    (X.ZodLiteral = "ZodLiteral"),
    (X.ZodEnum = "ZodEnum"),
    (X.ZodEffects = "ZodEffects"),
    (X.ZodNativeEnum = "ZodNativeEnum"),
    (X.ZodOptional = "ZodOptional"),
    (X.ZodNullable = "ZodNullable"),
    (X.ZodDefault = "ZodDefault"),
    (X.ZodCatch = "ZodCatch"),
    (X.ZodPromise = "ZodPromise"),
    (X.ZodBranded = "ZodBranded"),
    (X.ZodPipeline = "ZodPipeline"),
    (X.ZodReadonly = "ZodReadonly");
})(j || (j = {}));
var R2 = w1.create,
  I2 = I6.create,
  E2 = R4.create,
  b2 = E6.create,
  P2 = O4.create,
  S2 = GX.create,
  Z2 = D4.create,
  C2 = HX.create,
  k2 = BX.create,
  v2 = w4.create,
  T2 = a1.create,
  _2 = A1.create,
  x2 = A4.create,
  y2 = W1.create,
  OW = V0.create,
  g2 = V0.strictCreate,
  f2 = zX.create,
  h2 = O9.create,
  u2 = KX.create,
  l2 = M1.create,
  m2 = M4.create,
  c2 = j4.create,
  p2 = b6.create,
  d2 = JX.create,
  i2 = UX.create,
  n2 = VX.create,
  r2 = s1.create,
  o2 = LX.create,
  t2 = P6.create,
  a2 = G1.create,
  s2 = J1.create,
  e2 = _1.create,
  XS = G1.createWithPreprocess,
  QS = I4.create;
var ZV = Object.freeze({ status: "aborted" });
function O(X, Q, $) {
  function Y(H, B) {
    var z;
    Object.defineProperty(H, "_zod", { value: H._zod ?? {}, enumerable: !1 }),
      (z = H._zod).traits ?? (z.traits = new Set()),
      H._zod.traits.add(X),
      Q(H, B);
    for (let K in G.prototype)
      if (!(K in H))
        Object.defineProperty(H, K, { value: G.prototype[K].bind(H) });
    (H._zod.constr = G), (H._zod.def = B);
  }
  let W = $?.Parent ?? Object;
  class J extends W {}
  Object.defineProperty(J, "name", { value: X });
  function G(H) {
    var B;
    let z = $?.Parent ? new J() : this;
    Y(z, H), (B = z._zod).deferred ?? (B.deferred = []);
    for (let K of z._zod.deferred) K();
    return z;
  }
  return (
    Object.defineProperty(G, "init", { value: Y }),
    Object.defineProperty(G, Symbol.hasInstance, {
      value: (H) => {
        if ($?.Parent && H instanceof $.Parent) return !0;
        return H?._zod?.traits?.has(X);
      },
    }),
    Object.defineProperty(G, "name", { value: X }),
    G
  );
}
var CV = Symbol("zod_brand");
class x1 extends Error {
  constructor() {
    super(
      "Encountered Promise during synchronous parse. Use .parseAsync() instead."
    );
  }
}
var E4 = {};
function u0(X) {
  if (X) Object.assign(E4, X);
  return E4;
}
var i = {};
U7(i, {
  unwrapMessage: () => OX,
  stringifyPrimitive: () => S4,
  required: () => nV,
  randomString: () => fV,
  propertyKeyTypes: () => I9,
  promiseAllObject: () => gV,
  primitiveTypes: () => DW,
  prefixIssues: () => H1,
  pick: () => mV,
  partial: () => iV,
  optionalKeys: () => E9,
  omit: () => cV,
  numKeys: () => hV,
  nullish: () => AX,
  normalizeParams: () => y,
  merge: () => dV,
  jsonStringifyReplacer: () => A9,
  joinValues: () => b4,
  issue: () => P9,
  isPlainObject: () => Z6,
  isObject: () => S6,
  getSizableOrigin: () => AW,
  getParsedType: () => uV,
  getLengthableOrigin: () => jX,
  getEnumValues: () => DX,
  getElementAtPath: () => yV,
  floatSafeRemainder: () => M9,
  finalizeIssue: () => o0,
  extend: () => pV,
  escapeRegex: () => y1,
  esc: () => e1,
  defineLazy: () => Y0,
  createTransparentProxy: () => lV,
  clone: () => l0,
  cleanRegex: () => MX,
  cleanEnum: () => rV,
  captureStackTrace: () => P4,
  cached: () => wX,
  assignProp: () => j9,
  assertNotEqual: () => vV,
  assertNever: () => _V,
  assertIs: () => TV,
  assertEqual: () => kV,
  assert: () => xV,
  allowsEval: () => R9,
  aborted: () => X6,
  NUMBER_FORMAT_RANGES: () => b9,
  Class: () => MW,
  BIGINT_FORMAT_RANGES: () => wW,
});
function kV(X) {
  return X;
}
function vV(X) {
  return X;
}
function TV(X) {}
function _V(X) {
  throw Error();
}
function xV(X) {}
function DX(X) {
  let Q = Object.values(X).filter((Y) => typeof Y === "number");
  return Object.entries(X)
    .filter(([Y, W]) => Q.indexOf(+Y) === -1)
    .map(([Y, W]) => W);
}
function b4(X, Q = "|") {
  return X.map(($) => S4($)).join(Q);
}
function A9(X, Q) {
  if (typeof Q === "bigint") return Q.toString();
  return Q;
}
function wX(X) {
  return {
    get value() {
      {
        let $ = X();
        return Object.defineProperty(this, "value", { value: $ }), $;
      }
      throw Error("cached value already set");
    },
  };
}
function AX(X) {
  return X === null || X === void 0;
}
function MX(X) {
  let Q = X.startsWith("^") ? 1 : 0,
    $ = X.endsWith("$") ? X.length - 1 : X.length;
  return X.slice(Q, $);
}
function M9(X, Q) {
  let $ = (X.toString().split(".")[1] || "").length,
    Y = (Q.toString().split(".")[1] || "").length,
    W = $ > Y ? $ : Y,
    J = Number.parseInt(X.toFixed(W).replace(".", "")),
    G = Number.parseInt(Q.toFixed(W).replace(".", ""));
  return (J % G) / 10 ** W;
}
function Y0(X, Q, $) {
  Object.defineProperty(X, Q, {
    get() {
      {
        let W = $();
        return (X[Q] = W), W;
      }
      throw Error("cached value already set");
    },
    set(W) {
      Object.defineProperty(X, Q, { value: W });
    },
    configurable: !0,
  });
}
function j9(X, Q, $) {
  Object.defineProperty(X, Q, {
    value: $,
    writable: !0,
    enumerable: !0,
    configurable: !0,
  });
}
function yV(X, Q) {
  if (!Q) return X;
  return Q.reduce(($, Y) => $?.[Y], X);
}
function gV(X) {
  let Q = Object.keys(X),
    $ = Q.map((Y) => X[Y]);
  return Promise.all($).then((Y) => {
    let W = {};
    for (let J = 0; J < Q.length; J++) W[Q[J]] = Y[J];
    return W;
  });
}
function fV(X = 10) {
  let $ = "";
  for (let Y = 0; Y < X; Y++)
    $ += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  return $;
}
function e1(X) {
  return JSON.stringify(X);
}
var P4 = Error.captureStackTrace ? Error.captureStackTrace : (...X) => {};
function S6(X) {
  return typeof X === "object" && X !== null && !Array.isArray(X);
}
var R9 = wX(() => {
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare"))
    return !1;
  try {
    return new Function(""), !0;
  } catch (X) {
    return !1;
  }
});
function Z6(X) {
  if (S6(X) === !1) return !1;
  let Q = X.constructor;
  if (Q === void 0) return !0;
  let $ = Q.prototype;
  if (S6($) === !1) return !1;
  if (Object.prototype.hasOwnProperty.call($, "isPrototypeOf") === !1)
    return !1;
  return !0;
}
function hV(X) {
  let Q = 0;
  for (let $ in X) if (Object.prototype.hasOwnProperty.call(X, $)) Q++;
  return Q;
}
var uV = (X) => {
    let Q = typeof X;
    switch (Q) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(X) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(X)) return "array";
        if (X === null) return "null";
        if (
          X.then &&
          typeof X.then === "function" &&
          X.catch &&
          typeof X.catch === "function"
        )
          return "promise";
        if (typeof Map < "u" && X instanceof Map) return "map";
        if (typeof Set < "u" && X instanceof Set) return "set";
        if (typeof Date < "u" && X instanceof Date) return "date";
        if (typeof File < "u" && X instanceof File) return "file";
        return "object";
      default:
        throw Error(`Unknown data type: ${Q}`);
    }
  },
  I9 = new Set(["string", "number", "symbol"]),
  DW = new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined",
  ]);
function y1(X) {
  return X.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function l0(X, Q, $) {
  let Y = new X._zod.constr(Q ?? X._zod.def);
  if (!Q || $?.parent) Y._zod.parent = X;
  return Y;
}
function y(X) {
  let Q = X;
  if (!Q) return {};
  if (typeof Q === "string") return { error: () => Q };
  if (Q?.message !== void 0) {
    if (Q?.error !== void 0)
      throw Error("Cannot specify both `message` and `error` params");
    Q.error = Q.message;
  }
  if ((delete Q.message, typeof Q.error === "string"))
    return { ...Q, error: () => Q.error };
  return Q;
}
function lV(X) {
  let Q;
  return new Proxy(
    {},
    {
      get($, Y, W) {
        return Q ?? (Q = X()), Reflect.get(Q, Y, W);
      },
      set($, Y, W, J) {
        return Q ?? (Q = X()), Reflect.set(Q, Y, W, J);
      },
      has($, Y) {
        return Q ?? (Q = X()), Reflect.has(Q, Y);
      },
      deleteProperty($, Y) {
        return Q ?? (Q = X()), Reflect.deleteProperty(Q, Y);
      },
      ownKeys($) {
        return Q ?? (Q = X()), Reflect.ownKeys(Q);
      },
      getOwnPropertyDescriptor($, Y) {
        return Q ?? (Q = X()), Reflect.getOwnPropertyDescriptor(Q, Y);
      },
      defineProperty($, Y, W) {
        return Q ?? (Q = X()), Reflect.defineProperty(Q, Y, W);
      },
    }
  );
}
function S4(X) {
  if (typeof X === "bigint") return X.toString() + "n";
  if (typeof X === "string") return `"${X}"`;
  return `${X}`;
}
function E9(X) {
  return Object.keys(X).filter((Q) => {
    return X[Q]._zod.optin === "optional" && X[Q]._zod.optout === "optional";
  });
}
var b9 = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [
      -340282346638528860000000000000000000000,
      340282346638528860000000000000000000000,
    ],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
  },
  wW = {
    int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
    uint64: [BigInt(0), BigInt("18446744073709551615")],
  };
function mV(X, Q) {
  let $ = {},
    Y = X._zod.def;
  for (let W in Q) {
    if (!(W in Y.shape)) throw Error(`Unrecognized key: "${W}"`);
    if (!Q[W]) continue;
    $[W] = Y.shape[W];
  }
  return l0(X, { ...X._zod.def, shape: $, checks: [] });
}
function cV(X, Q) {
  let $ = { ...X._zod.def.shape },
    Y = X._zod.def;
  for (let W in Q) {
    if (!(W in Y.shape)) throw Error(`Unrecognized key: "${W}"`);
    if (!Q[W]) continue;
    delete $[W];
  }
  return l0(X, { ...X._zod.def, shape: $, checks: [] });
}
function pV(X, Q) {
  if (!Z6(Q)) throw Error("Invalid input to extend: expected a plain object");
  let $ = {
    ...X._zod.def,
    get shape() {
      let Y = { ...X._zod.def.shape, ...Q };
      return j9(this, "shape", Y), Y;
    },
    checks: [],
  };
  return l0(X, $);
}
function dV(X, Q) {
  return l0(X, {
    ...X._zod.def,
    get shape() {
      let $ = { ...X._zod.def.shape, ...Q._zod.def.shape };
      return j9(this, "shape", $), $;
    },
    catchall: Q._zod.def.catchall,
    checks: [],
  });
}
function iV(X, Q, $) {
  let Y = Q._zod.def.shape,
    W = { ...Y };
  if ($)
    for (let J in $) {
      if (!(J in Y)) throw Error(`Unrecognized key: "${J}"`);
      if (!$[J]) continue;
      W[J] = X ? new X({ type: "optional", innerType: Y[J] }) : Y[J];
    }
  else
    for (let J in Y)
      W[J] = X ? new X({ type: "optional", innerType: Y[J] }) : Y[J];
  return l0(Q, { ...Q._zod.def, shape: W, checks: [] });
}
function nV(X, Q, $) {
  let Y = Q._zod.def.shape,
    W = { ...Y };
  if ($)
    for (let J in $) {
      if (!(J in W)) throw Error(`Unrecognized key: "${J}"`);
      if (!$[J]) continue;
      W[J] = new X({ type: "nonoptional", innerType: Y[J] });
    }
  else for (let J in Y) W[J] = new X({ type: "nonoptional", innerType: Y[J] });
  return l0(Q, { ...Q._zod.def, shape: W, checks: [] });
}
function X6(X, Q = 0) {
  for (let $ = Q; $ < X.issues.length; $++)
    if (X.issues[$]?.continue !== !0) return !0;
  return !1;
}
function H1(X, Q) {
  return Q.map(($) => {
    var Y;
    return (Y = $).path ?? (Y.path = []), $.path.unshift(X), $;
  });
}
function OX(X) {
  return typeof X === "string" ? X : X?.message;
}
function o0(X, Q, $) {
  let Y = { ...X, path: X.path ?? [] };
  if (!X.message) {
    let W =
      OX(X.inst?._zod.def?.error?.(X)) ??
      OX(Q?.error?.(X)) ??
      OX($.customError?.(X)) ??
      OX($.localeError?.(X)) ??
      "Invalid input";
    Y.message = W;
  }
  if ((delete Y.inst, delete Y.continue, !Q?.reportInput)) delete Y.input;
  return Y;
}
function AW(X) {
  if (X instanceof Set) return "set";
  if (X instanceof Map) return "map";
  if (X instanceof File) return "file";
  return "unknown";
}
function jX(X) {
  if (Array.isArray(X)) return "array";
  if (typeof X === "string") return "string";
  return "unknown";
}
function P9(...X) {
  let [Q, $, Y] = X;
  if (typeof Q === "string")
    return { message: Q, code: "custom", input: $, inst: Y };
  return { ...Q };
}
function rV(X) {
  return Object.entries(X)
    .filter(([Q, $]) => {
      return Number.isNaN(Number.parseInt(Q, 10));
    })
    .map((Q) => Q[1]);
}
class MW {
  constructor(...X) {}
}
var jW = (X, Q) => {
    (X.name = "$ZodError"),
      Object.defineProperty(X, "_zod", { value: X._zod, enumerable: !1 }),
      Object.defineProperty(X, "issues", { value: Q, enumerable: !1 }),
      Object.defineProperty(X, "message", {
        get() {
          return JSON.stringify(Q, A9, 2);
        },
        enumerable: !0,
      });
  },
  Z4 = O("$ZodError", jW),
  RX = O("$ZodError", jW, { Parent: Error });
function S9(X, Q = ($) => $.message) {
  let $ = {},
    Y = [];
  for (let W of X.issues)
    if (W.path.length > 0)
      ($[W.path[0]] = $[W.path[0]] || []), $[W.path[0]].push(Q(W));
    else Y.push(Q(W));
  return { formErrors: Y, fieldErrors: $ };
}
function Z9(X, Q) {
  let $ =
      Q ||
      function (J) {
        return J.message;
      },
    Y = { _errors: [] },
    W = (J) => {
      for (let G of J.issues)
        if (G.code === "invalid_union" && G.errors.length)
          G.errors.map((H) => W({ issues: H }));
        else if (G.code === "invalid_key") W({ issues: G.issues });
        else if (G.code === "invalid_element") W({ issues: G.issues });
        else if (G.path.length === 0) Y._errors.push($(G));
        else {
          let H = Y,
            B = 0;
          while (B < G.path.length) {
            let z = G.path[B];
            if (B !== G.path.length - 1) H[z] = H[z] || { _errors: [] };
            else (H[z] = H[z] || { _errors: [] }), H[z]._errors.push($(G));
            (H = H[z]), B++;
          }
        }
    };
  return W(X), Y;
}
var C9 = (X) => (Q, $, Y, W) => {
    let J = Y ? Object.assign(Y, { async: !1 }) : { async: !1 },
      G = Q._zod.run({ value: $, issues: [] }, J);
    if (G instanceof Promise) throw new x1();
    if (G.issues.length) {
      let H = new (W?.Err ?? X)(G.issues.map((B) => o0(B, J, u0())));
      throw (P4(H, W?.callee), H);
    }
    return G.value;
  },
  k9 = C9(RX),
  v9 = (X) => async (Q, $, Y, W) => {
    let J = Y ? Object.assign(Y, { async: !0 }) : { async: !0 },
      G = Q._zod.run({ value: $, issues: [] }, J);
    if (G instanceof Promise) G = await G;
    if (G.issues.length) {
      let H = new (W?.Err ?? X)(G.issues.map((B) => o0(B, J, u0())));
      throw (P4(H, W?.callee), H);
    }
    return G.value;
  },
  T9 = v9(RX),
  _9 = (X) => (Q, $, Y) => {
    let W = Y ? { ...Y, async: !1 } : { async: !1 },
      J = Q._zod.run({ value: $, issues: [] }, W);
    if (J instanceof Promise) throw new x1();
    return J.issues.length
      ? {
          success: !1,
          error: new (X ?? Z4)(J.issues.map((G) => o0(G, W, u0()))),
        }
      : { success: !0, data: J.value };
  },
  Q6 = _9(RX),
  x9 = (X) => async (Q, $, Y) => {
    let W = Y ? Object.assign(Y, { async: !0 }) : { async: !0 },
      J = Q._zod.run({ value: $, issues: [] }, W);
    if (J instanceof Promise) J = await J;
    return J.issues.length
      ? { success: !1, error: new X(J.issues.map((G) => o0(G, W, u0()))) }
      : { success: !0, data: J.value };
  },
  $6 = x9(RX);
var RW = /^[cC][^\s-]{8,}$/,
  IW = /^[0-9a-z]+$/,
  EW = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/,
  bW = /^[0-9a-vA-V]{20}$/,
  PW = /^[A-Za-z0-9]{27}$/,
  SW = /^[a-zA-Z0-9_-]{21}$/,
  ZW =
    /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var CW =
    /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  y9 = (X) => {
    if (!X)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
    return new RegExp(
      `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${X}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`
    );
  };
var kW =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
function vW() {
  return new RegExp(
    "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
    "u"
  );
}
var TW =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  _W =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/,
  xW =
    /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
  yW =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  gW =
    /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
  g9 = /^[A-Za-z0-9_-]*$/,
  fW = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
var hW = /^\+(?:[0-9]){6,14}[0-9]$/,
  uW =
    "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))",
  lW = new RegExp(`^${uW}$`);
function mW(X) {
  return typeof X.precision === "number"
    ? X.precision === -1
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d"
      : X.precision === 0
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d"
      : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${X.precision}}`
    : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}
function cW(X) {
  return new RegExp(`^${mW(X)}$`);
}
function pW(X) {
  let Q = mW({ precision: X.precision }),
    $ = ["Z"];
  if (X.local) $.push("");
  if (X.offset) $.push("([+-]\\d{2}:\\d{2})");
  let Y = `${Q}(?:${$.join("|")})`;
  return new RegExp(`^${uW}T(?:${Y})$`);
}
var dW = (X) => {
  let Q = X ? `[\\s\\S]{${X?.minimum ?? 0},${X?.maximum ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${Q}$`);
};
var iW = /^\d+$/,
  nW = /^-?\d+(?:\.\d+)?/i,
  rW = /true|false/i,
  oW = /null/i;
var tW = /^[^A-Z]*$/,
  aW = /^[^a-z]*$/;
var A0 = O("$ZodCheck", (X, Q) => {
    var $;
    X._zod ?? (X._zod = {}),
      (X._zod.def = Q),
      ($ = X._zod).onattach ?? ($.onattach = []);
  }),
  sW = { number: "number", bigint: "bigint", object: "date" },
  f9 = O("$ZodCheckLessThan", (X, Q) => {
    A0.init(X, Q);
    let $ = sW[typeof Q.value];
    X._zod.onattach.push((Y) => {
      let W = Y._zod.bag,
        J =
          (Q.inclusive ? W.maximum : W.exclusiveMaximum) ??
          Number.POSITIVE_INFINITY;
      if (Q.value < J)
        if (Q.inclusive) W.maximum = Q.value;
        else W.exclusiveMaximum = Q.value;
    }),
      (X._zod.check = (Y) => {
        if (Q.inclusive ? Y.value <= Q.value : Y.value < Q.value) return;
        Y.issues.push({
          origin: $,
          code: "too_big",
          maximum: Q.value,
          input: Y.value,
          inclusive: Q.inclusive,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  h9 = O("$ZodCheckGreaterThan", (X, Q) => {
    A0.init(X, Q);
    let $ = sW[typeof Q.value];
    X._zod.onattach.push((Y) => {
      let W = Y._zod.bag,
        J =
          (Q.inclusive ? W.minimum : W.exclusiveMinimum) ??
          Number.NEGATIVE_INFINITY;
      if (Q.value > J)
        if (Q.inclusive) W.minimum = Q.value;
        else W.exclusiveMinimum = Q.value;
    }),
      (X._zod.check = (Y) => {
        if (Q.inclusive ? Y.value >= Q.value : Y.value > Q.value) return;
        Y.issues.push({
          origin: $,
          code: "too_small",
          minimum: Q.value,
          input: Y.value,
          inclusive: Q.inclusive,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  eW = O("$ZodCheckMultipleOf", (X, Q) => {
    A0.init(X, Q),
      X._zod.onattach.push(($) => {
        var Y;
        (Y = $._zod.bag).multipleOf ?? (Y.multipleOf = Q.value);
      }),
      (X._zod.check = ($) => {
        if (typeof $.value !== typeof Q.value)
          throw Error("Cannot mix number and bigint in multiple_of check.");
        if (
          typeof $.value === "bigint"
            ? $.value % Q.value === BigInt(0)
            : M9($.value, Q.value) === 0
        )
          return;
        $.issues.push({
          origin: typeof $.value,
          code: "not_multiple_of",
          divisor: Q.value,
          input: $.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  XJ = O("$ZodCheckNumberFormat", (X, Q) => {
    A0.init(X, Q), (Q.format = Q.format || "float64");
    let $ = Q.format?.includes("int"),
      Y = $ ? "int" : "number",
      [W, J] = b9[Q.format];
    X._zod.onattach.push((G) => {
      let H = G._zod.bag;
      if (((H.format = Q.format), (H.minimum = W), (H.maximum = J), $))
        H.pattern = iW;
    }),
      (X._zod.check = (G) => {
        let H = G.value;
        if ($) {
          if (!Number.isInteger(H)) {
            G.issues.push({
              expected: Y,
              format: Q.format,
              code: "invalid_type",
              input: H,
              inst: X,
            });
            return;
          }
          if (!Number.isSafeInteger(H)) {
            if (H > 0)
              G.issues.push({
                input: H,
                code: "too_big",
                maximum: Number.MAX_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst: X,
                origin: Y,
                continue: !Q.abort,
              });
            else
              G.issues.push({
                input: H,
                code: "too_small",
                minimum: Number.MIN_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst: X,
                origin: Y,
                continue: !Q.abort,
              });
            return;
          }
        }
        if (H < W)
          G.issues.push({
            origin: "number",
            input: H,
            code: "too_small",
            minimum: W,
            inclusive: !0,
            inst: X,
            continue: !Q.abort,
          });
        if (H > J)
          G.issues.push({
            origin: "number",
            input: H,
            code: "too_big",
            maximum: J,
            inst: X,
          });
      });
  });
var QJ = O("$ZodCheckMaxLength", (X, Q) => {
    A0.init(X, Q),
      (X._zod.when = ($) => {
        let Y = $.value;
        return !AX(Y) && Y.length !== void 0;
      }),
      X._zod.onattach.push(($) => {
        let Y = $._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
        if (Q.maximum < Y) $._zod.bag.maximum = Q.maximum;
      }),
      (X._zod.check = ($) => {
        let Y = $.value;
        if (Y.length <= Q.maximum) return;
        let J = jX(Y);
        $.issues.push({
          origin: J,
          code: "too_big",
          maximum: Q.maximum,
          inclusive: !0,
          input: Y,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  $J = O("$ZodCheckMinLength", (X, Q) => {
    A0.init(X, Q),
      (X._zod.when = ($) => {
        let Y = $.value;
        return !AX(Y) && Y.length !== void 0;
      }),
      X._zod.onattach.push(($) => {
        let Y = $._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
        if (Q.minimum > Y) $._zod.bag.minimum = Q.minimum;
      }),
      (X._zod.check = ($) => {
        let Y = $.value;
        if (Y.length >= Q.minimum) return;
        let J = jX(Y);
        $.issues.push({
          origin: J,
          code: "too_small",
          minimum: Q.minimum,
          inclusive: !0,
          input: Y,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  YJ = O("$ZodCheckLengthEquals", (X, Q) => {
    A0.init(X, Q),
      (X._zod.when = ($) => {
        let Y = $.value;
        return !AX(Y) && Y.length !== void 0;
      }),
      X._zod.onattach.push(($) => {
        let Y = $._zod.bag;
        (Y.minimum = Q.length), (Y.maximum = Q.length), (Y.length = Q.length);
      }),
      (X._zod.check = ($) => {
        let Y = $.value,
          W = Y.length;
        if (W === Q.length) return;
        let J = jX(Y),
          G = W > Q.length;
        $.issues.push({
          origin: J,
          ...(G
            ? { code: "too_big", maximum: Q.length }
            : { code: "too_small", minimum: Q.length }),
          inclusive: !0,
          exact: !0,
          input: $.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  IX = O("$ZodCheckStringFormat", (X, Q) => {
    var $, Y;
    if (
      (A0.init(X, Q),
      X._zod.onattach.push((W) => {
        let J = W._zod.bag;
        if (((J.format = Q.format), Q.pattern))
          J.patterns ?? (J.patterns = new Set()), J.patterns.add(Q.pattern);
      }),
      Q.pattern)
    )
      ($ = X._zod).check ??
        ($.check = (W) => {
          if (((Q.pattern.lastIndex = 0), Q.pattern.test(W.value))) return;
          W.issues.push({
            origin: "string",
            code: "invalid_format",
            format: Q.format,
            input: W.value,
            ...(Q.pattern ? { pattern: Q.pattern.toString() } : {}),
            inst: X,
            continue: !Q.abort,
          });
        });
    else (Y = X._zod).check ?? (Y.check = () => {});
  }),
  WJ = O("$ZodCheckRegex", (X, Q) => {
    IX.init(X, Q),
      (X._zod.check = ($) => {
        if (((Q.pattern.lastIndex = 0), Q.pattern.test($.value))) return;
        $.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "regex",
          input: $.value,
          pattern: Q.pattern.toString(),
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  JJ = O("$ZodCheckLowerCase", (X, Q) => {
    Q.pattern ?? (Q.pattern = tW), IX.init(X, Q);
  }),
  GJ = O("$ZodCheckUpperCase", (X, Q) => {
    Q.pattern ?? (Q.pattern = aW), IX.init(X, Q);
  }),
  HJ = O("$ZodCheckIncludes", (X, Q) => {
    A0.init(X, Q);
    let $ = y1(Q.includes),
      Y = new RegExp(
        typeof Q.position === "number" ? `^.{${Q.position}}${$}` : $
      );
    (Q.pattern = Y),
      X._zod.onattach.push((W) => {
        let J = W._zod.bag;
        J.patterns ?? (J.patterns = new Set()), J.patterns.add(Y);
      }),
      (X._zod.check = (W) => {
        if (W.value.includes(Q.includes, Q.position)) return;
        W.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "includes",
          includes: Q.includes,
          input: W.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  BJ = O("$ZodCheckStartsWith", (X, Q) => {
    A0.init(X, Q);
    let $ = new RegExp(`^${y1(Q.prefix)}.*`);
    Q.pattern ?? (Q.pattern = $),
      X._zod.onattach.push((Y) => {
        let W = Y._zod.bag;
        W.patterns ?? (W.patterns = new Set()), W.patterns.add($);
      }),
      (X._zod.check = (Y) => {
        if (Y.value.startsWith(Q.prefix)) return;
        Y.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "starts_with",
          prefix: Q.prefix,
          input: Y.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  zJ = O("$ZodCheckEndsWith", (X, Q) => {
    A0.init(X, Q);
    let $ = new RegExp(`.*${y1(Q.suffix)}$`);
    Q.pattern ?? (Q.pattern = $),
      X._zod.onattach.push((Y) => {
        let W = Y._zod.bag;
        W.patterns ?? (W.patterns = new Set()), W.patterns.add($);
      }),
      (X._zod.check = (Y) => {
        if (Y.value.endsWith(Q.suffix)) return;
        Y.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "ends_with",
          suffix: Q.suffix,
          input: Y.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  });
var KJ = O("$ZodCheckOverwrite", (X, Q) => {
  A0.init(X, Q),
    (X._zod.check = ($) => {
      $.value = Q.tx($.value);
    });
});
class u9 {
  constructor(X = []) {
    if (((this.content = []), (this.indent = 0), this)) this.args = X;
  }
  indented(X) {
    (this.indent += 1), X(this), (this.indent -= 1);
  }
  write(X) {
    if (typeof X === "function") {
      X(this, { execution: "sync" }), X(this, { execution: "async" });
      return;
    }
    let $ = X.split(
        `
`
      ).filter((J) => J),
      Y = Math.min(...$.map((J) => J.length - J.trimStart().length)),
      W = $.map((J) => J.slice(Y)).map((J) => " ".repeat(this.indent * 2) + J);
    for (let J of W) this.content.push(J);
  }
  compile() {
    let X = Function,
      Q = this?.args,
      Y = [...(this?.content ?? [""]).map((W) => `  ${W}`)];
    return new X(
      ...Q,
      Y.join(`
`)
    );
  }
}
var VJ = { major: 4, minor: 0, patch: 0 };
var X0 = O("$ZodType", (X, Q) => {
    var $;
    X ?? (X = {}),
      (X._zod.def = Q),
      (X._zod.bag = X._zod.bag || {}),
      (X._zod.version = VJ);
    let Y = [...(X._zod.def.checks ?? [])];
    if (X._zod.traits.has("$ZodCheck")) Y.unshift(X);
    for (let W of Y) for (let J of W._zod.onattach) J(X);
    if (Y.length === 0)
      ($ = X._zod).deferred ?? ($.deferred = []),
        X._zod.deferred?.push(() => {
          X._zod.run = X._zod.parse;
        });
    else {
      let W = (J, G, H) => {
        let B = X6(J),
          z;
        for (let K of G) {
          if (K._zod.when) {
            if (!K._zod.when(J)) continue;
          } else if (B) continue;
          let V = J.issues.length,
            L = K._zod.check(J);
          if (L instanceof Promise && H?.async === !1) throw new x1();
          if (z || L instanceof Promise)
            z = (z ?? Promise.resolve()).then(async () => {
              if ((await L, J.issues.length === V)) return;
              if (!B) B = X6(J, V);
            });
          else {
            if (J.issues.length === V) continue;
            if (!B) B = X6(J, V);
          }
        }
        if (z)
          return z.then(() => {
            return J;
          });
        return J;
      };
      X._zod.run = (J, G) => {
        let H = X._zod.parse(J, G);
        if (H instanceof Promise) {
          if (G.async === !1) throw new x1();
          return H.then((B) => W(B, Y, G));
        }
        return W(H, Y, G);
      };
    }
    X["~standard"] = {
      validate: (W) => {
        try {
          let J = Q6(X, W);
          return J.success ? { value: J.data } : { issues: J.error?.issues };
        } catch (J) {
          return $6(X, W).then((G) =>
            G.success ? { value: G.data } : { issues: G.error?.issues }
          );
        }
      },
      vendor: "zod",
      version: 1,
    };
  }),
  EX = O("$ZodString", (X, Q) => {
    X0.init(X, Q),
      (X._zod.pattern =
        [...(X?._zod.bag?.patterns ?? [])].pop() ?? dW(X._zod.bag)),
      (X._zod.parse = ($, Y) => {
        if (Q.coerce)
          try {
            $.value = String($.value);
          } catch (W) {}
        if (typeof $.value === "string") return $;
        return (
          $.issues.push({
            expected: "string",
            code: "invalid_type",
            input: $.value,
            inst: X,
          }),
          $
        );
      });
  }),
  W0 = O("$ZodStringFormat", (X, Q) => {
    IX.init(X, Q), EX.init(X, Q);
  }),
  m9 = O("$ZodGUID", (X, Q) => {
    Q.pattern ?? (Q.pattern = CW), W0.init(X, Q);
  }),
  c9 = O("$ZodUUID", (X, Q) => {
    if (Q.version) {
      let Y = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[
        Q.version
      ];
      if (Y === void 0) throw Error(`Invalid UUID version: "${Q.version}"`);
      Q.pattern ?? (Q.pattern = y9(Y));
    } else Q.pattern ?? (Q.pattern = y9());
    W0.init(X, Q);
  }),
  p9 = O("$ZodEmail", (X, Q) => {
    Q.pattern ?? (Q.pattern = kW), W0.init(X, Q);
  }),
  d9 = O("$ZodURL", (X, Q) => {
    W0.init(X, Q),
      (X._zod.check = ($) => {
        try {
          let Y = $.value,
            W = new URL(Y),
            J = W.href;
          if (Q.hostname) {
            if (((Q.hostname.lastIndex = 0), !Q.hostname.test(W.hostname)))
              $.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid hostname",
                pattern: fW.source,
                input: $.value,
                inst: X,
                continue: !Q.abort,
              });
          }
          if (Q.protocol) {
            if (
              ((Q.protocol.lastIndex = 0),
              !Q.protocol.test(
                W.protocol.endsWith(":") ? W.protocol.slice(0, -1) : W.protocol
              ))
            )
              $.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid protocol",
                pattern: Q.protocol.source,
                input: $.value,
                inst: X,
                continue: !Q.abort,
              });
          }
          if (!Y.endsWith("/") && J.endsWith("/")) $.value = J.slice(0, -1);
          else $.value = J;
          return;
        } catch (Y) {
          $.issues.push({
            code: "invalid_format",
            format: "url",
            input: $.value,
            inst: X,
            continue: !Q.abort,
          });
        }
      });
  }),
  i9 = O("$ZodEmoji", (X, Q) => {
    Q.pattern ?? (Q.pattern = vW()), W0.init(X, Q);
  }),
  n9 = O("$ZodNanoID", (X, Q) => {
    Q.pattern ?? (Q.pattern = SW), W0.init(X, Q);
  }),
  r9 = O("$ZodCUID", (X, Q) => {
    Q.pattern ?? (Q.pattern = RW), W0.init(X, Q);
  }),
  o9 = O("$ZodCUID2", (X, Q) => {
    Q.pattern ?? (Q.pattern = IW), W0.init(X, Q);
  }),
  t9 = O("$ZodULID", (X, Q) => {
    Q.pattern ?? (Q.pattern = EW), W0.init(X, Q);
  }),
  a9 = O("$ZodXID", (X, Q) => {
    Q.pattern ?? (Q.pattern = bW), W0.init(X, Q);
  }),
  s9 = O("$ZodKSUID", (X, Q) => {
    Q.pattern ?? (Q.pattern = PW), W0.init(X, Q);
  }),
  jJ = O("$ZodISODateTime", (X, Q) => {
    Q.pattern ?? (Q.pattern = pW(Q)), W0.init(X, Q);
  }),
  RJ = O("$ZodISODate", (X, Q) => {
    Q.pattern ?? (Q.pattern = lW), W0.init(X, Q);
  }),
  IJ = O("$ZodISOTime", (X, Q) => {
    Q.pattern ?? (Q.pattern = cW(Q)), W0.init(X, Q);
  }),
  EJ = O("$ZodISODuration", (X, Q) => {
    Q.pattern ?? (Q.pattern = ZW), W0.init(X, Q);
  }),
  e9 = O("$ZodIPv4", (X, Q) => {
    Q.pattern ?? (Q.pattern = TW),
      W0.init(X, Q),
      X._zod.onattach.push(($) => {
        let Y = $._zod.bag;
        Y.format = "ipv4";
      });
  }),
  XQ = O("$ZodIPv6", (X, Q) => {
    Q.pattern ?? (Q.pattern = _W),
      W0.init(X, Q),
      X._zod.onattach.push(($) => {
        let Y = $._zod.bag;
        Y.format = "ipv6";
      }),
      (X._zod.check = ($) => {
        try {
          new URL(`http://[${$.value}]`);
        } catch {
          $.issues.push({
            code: "invalid_format",
            format: "ipv6",
            input: $.value,
            inst: X,
            continue: !Q.abort,
          });
        }
      });
  }),
  QQ = O("$ZodCIDRv4", (X, Q) => {
    Q.pattern ?? (Q.pattern = xW), W0.init(X, Q);
  }),
  $Q = O("$ZodCIDRv6", (X, Q) => {
    Q.pattern ?? (Q.pattern = yW),
      W0.init(X, Q),
      (X._zod.check = ($) => {
        let [Y, W] = $.value.split("/");
        try {
          if (!W) throw Error();
          let J = Number(W);
          if (`${J}` !== W) throw Error();
          if (J < 0 || J > 128) throw Error();
          new URL(`http://[${Y}]`);
        } catch {
          $.issues.push({
            code: "invalid_format",
            format: "cidrv6",
            input: $.value,
            inst: X,
            continue: !Q.abort,
          });
        }
      });
  });
function bJ(X) {
  if (X === "") return !0;
  if (X.length % 4 !== 0) return !1;
  try {
    return atob(X), !0;
  } catch {
    return !1;
  }
}
var YQ = O("$ZodBase64", (X, Q) => {
  Q.pattern ?? (Q.pattern = gW),
    W0.init(X, Q),
    X._zod.onattach.push(($) => {
      $._zod.bag.contentEncoding = "base64";
    }),
    (X._zod.check = ($) => {
      if (bJ($.value)) return;
      $.issues.push({
        code: "invalid_format",
        format: "base64",
        input: $.value,
        inst: X,
        continue: !Q.abort,
      });
    });
});
function tV(X) {
  if (!g9.test(X)) return !1;
  let Q = X.replace(/[-_]/g, (Y) => (Y === "-" ? "+" : "/")),
    $ = Q.padEnd(Math.ceil(Q.length / 4) * 4, "=");
  return bJ($);
}
var WQ = O("$ZodBase64URL", (X, Q) => {
    Q.pattern ?? (Q.pattern = g9),
      W0.init(X, Q),
      X._zod.onattach.push(($) => {
        $._zod.bag.contentEncoding = "base64url";
      }),
      (X._zod.check = ($) => {
        if (tV($.value)) return;
        $.issues.push({
          code: "invalid_format",
          format: "base64url",
          input: $.value,
          inst: X,
          continue: !Q.abort,
        });
      });
  }),
  JQ = O("$ZodE164", (X, Q) => {
    Q.pattern ?? (Q.pattern = hW), W0.init(X, Q);
  });
function aV(X, Q = null) {
  try {
    let $ = X.split(".");
    if ($.length !== 3) return !1;
    let [Y] = $;
    if (!Y) return !1;
    let W = JSON.parse(atob(Y));
    if ("typ" in W && W?.typ !== "JWT") return !1;
    if (!W.alg) return !1;
    if (Q && (!("alg" in W) || W.alg !== Q)) return !1;
    return !0;
  } catch {
    return !1;
  }
}
var GQ = O("$ZodJWT", (X, Q) => {
  W0.init(X, Q),
    (X._zod.check = ($) => {
      if (aV($.value, Q.alg)) return;
      $.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: $.value,
        inst: X,
        continue: !Q.abort,
      });
    });
});
var v4 = O("$ZodNumber", (X, Q) => {
    X0.init(X, Q),
      (X._zod.pattern = X._zod.bag.pattern ?? nW),
      (X._zod.parse = ($, Y) => {
        if (Q.coerce)
          try {
            $.value = Number($.value);
          } catch (G) {}
        let W = $.value;
        if (typeof W === "number" && !Number.isNaN(W) && Number.isFinite(W))
          return $;
        let J =
          typeof W === "number"
            ? Number.isNaN(W)
              ? "NaN"
              : !Number.isFinite(W)
              ? "Infinity"
              : void 0
            : void 0;
        return (
          $.issues.push({
            expected: "number",
            code: "invalid_type",
            input: W,
            inst: X,
            ...(J ? { received: J } : {}),
          }),
          $
        );
      });
  }),
  HQ = O("$ZodNumber", (X, Q) => {
    XJ.init(X, Q), v4.init(X, Q);
  }),
  BQ = O("$ZodBoolean", (X, Q) => {
    X0.init(X, Q),
      (X._zod.pattern = rW),
      (X._zod.parse = ($, Y) => {
        if (Q.coerce)
          try {
            $.value = Boolean($.value);
          } catch (J) {}
        let W = $.value;
        if (typeof W === "boolean") return $;
        return (
          $.issues.push({
            expected: "boolean",
            code: "invalid_type",
            input: W,
            inst: X,
          }),
          $
        );
      });
  });
var zQ = O("$ZodNull", (X, Q) => {
  X0.init(X, Q),
    (X._zod.pattern = oW),
    (X._zod.values = new Set([null])),
    (X._zod.parse = ($, Y) => {
      let W = $.value;
      if (W === null) return $;
      return (
        $.issues.push({
          expected: "null",
          code: "invalid_type",
          input: W,
          inst: X,
        }),
        $
      );
    });
});
var KQ = O("$ZodUnknown", (X, Q) => {
    X0.init(X, Q), (X._zod.parse = ($) => $);
  }),
  UQ = O("$ZodNever", (X, Q) => {
    X0.init(X, Q),
      (X._zod.parse = ($, Y) => {
        return (
          $.issues.push({
            expected: "never",
            code: "invalid_type",
            input: $.value,
            inst: X,
          }),
          $
        );
      });
  });
function LJ(X, Q, $) {
  if (X.issues.length) Q.issues.push(...H1($, X.issues));
  Q.value[$] = X.value;
}
var VQ = O("$ZodArray", (X, Q) => {
  X0.init(X, Q),
    (X._zod.parse = ($, Y) => {
      let W = $.value;
      if (!Array.isArray(W))
        return (
          $.issues.push({
            expected: "array",
            code: "invalid_type",
            input: W,
            inst: X,
          }),
          $
        );
      $.value = Array(W.length);
      let J = [];
      for (let G = 0; G < W.length; G++) {
        let H = W[G],
          B = Q.element._zod.run({ value: H, issues: [] }, Y);
        if (B instanceof Promise) J.push(B.then((z) => LJ(z, $, G)));
        else LJ(B, $, G);
      }
      if (J.length) return Promise.all(J).then(() => $);
      return $;
    });
});
function k4(X, Q, $) {
  if (X.issues.length) Q.issues.push(...H1($, X.issues));
  Q.value[$] = X.value;
}
function qJ(X, Q, $, Y) {
  if (X.issues.length)
    if (Y[$] === void 0)
      if ($ in Y) Q.value[$] = void 0;
      else Q.value[$] = X.value;
    else Q.issues.push(...H1($, X.issues));
  else if (X.value === void 0) {
    if ($ in Y) Q.value[$] = void 0;
  } else Q.value[$] = X.value;
}
var T4 = O("$ZodObject", (X, Q) => {
  X0.init(X, Q);
  let $ = wX(() => {
    let V = Object.keys(Q.shape);
    for (let U of V)
      if (!(Q.shape[U] instanceof X0))
        throw Error(`Invalid element at key "${U}": expected a Zod schema`);
    let L = E9(Q.shape);
    return {
      shape: Q.shape,
      keys: V,
      keySet: new Set(V),
      numKeys: V.length,
      optionalKeys: new Set(L),
    };
  });
  Y0(X._zod, "propValues", () => {
    let V = Q.shape,
      L = {};
    for (let U in V) {
      let F = V[U]._zod;
      if (F.values) {
        L[U] ?? (L[U] = new Set());
        for (let q of F.values) L[U].add(q);
      }
    }
    return L;
  });
  let Y = (V) => {
      let L = new u9(["shape", "payload", "ctx"]),
        U = $.value,
        F = (M) => {
          let R = e1(M);
          return `shape[${R}]._zod.run({ value: input[${R}], issues: [] }, ctx)`;
        };
      L.write("const input = payload.value;");
      let q = Object.create(null),
        N = 0;
      for (let M of U.keys) q[M] = `key_${N++}`;
      L.write("const newResult = {}");
      for (let M of U.keys)
        if (U.optionalKeys.has(M)) {
          let R = q[M];
          L.write(`const ${R} = ${F(M)};`);
          let S = e1(M);
          L.write(`
        if (${R}.issues.length) {
          if (input[${S}] === undefined) {
            if (${S} in input) {
              newResult[${S}] = undefined;
            }
          } else {
            payload.issues = payload.issues.concat(
              ${R}.issues.map((iss) => ({
                ...iss,
                path: iss.path ? [${S}, ...iss.path] : [${S}],
              }))
            );
          }
        } else if (${R}.value === undefined) {
          if (${S} in input) newResult[${S}] = undefined;
        } else {
          newResult[${S}] = ${R}.value;
        }
        `);
        } else {
          let R = q[M];
          L.write(`const ${R} = ${F(M)};`),
            L.write(`
          if (${R}.issues.length) payload.issues = payload.issues.concat(${R}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${e1(M)}, ...iss.path] : [${e1(M)}]
          })));`),
            L.write(`newResult[${e1(M)}] = ${R}.value`);
        }
      L.write("payload.value = newResult;"), L.write("return payload;");
      let w = L.compile();
      return (M, R) => w(V, M, R);
    },
    W,
    J = S6,
    G = !E4.jitless,
    B = G && R9.value,
    z = Q.catchall,
    K;
  X._zod.parse = (V, L) => {
    K ?? (K = $.value);
    let U = V.value;
    if (!J(U))
      return (
        V.issues.push({
          expected: "object",
          code: "invalid_type",
          input: U,
          inst: X,
        }),
        V
      );
    let F = [];
    if (G && B && L?.async === !1 && L.jitless !== !0) {
      if (!W) W = Y(Q.shape);
      V = W(V, L);
    } else {
      V.value = {};
      let R = K.shape;
      for (let S of K.keys) {
        let C = R[S],
          K0 = C._zod.run({ value: U[S], issues: [] }, L),
          U0 = C._zod.optin === "optional" && C._zod.optout === "optional";
        if (K0 instanceof Promise)
          F.push(K0.then((s) => (U0 ? qJ(s, V, S, U) : k4(s, V, S))));
        else if (U0) qJ(K0, V, S, U);
        else k4(K0, V, S);
      }
    }
    if (!z) return F.length ? Promise.all(F).then(() => V) : V;
    let q = [],
      N = K.keySet,
      w = z._zod,
      M = w.def.type;
    for (let R of Object.keys(U)) {
      if (N.has(R)) continue;
      if (M === "never") {
        q.push(R);
        continue;
      }
      let S = w.run({ value: U[R], issues: [] }, L);
      if (S instanceof Promise) F.push(S.then((C) => k4(C, V, R)));
      else k4(S, V, R);
    }
    if (q.length)
      V.issues.push({ code: "unrecognized_keys", keys: q, input: U, inst: X });
    if (!F.length) return V;
    return Promise.all(F).then(() => {
      return V;
    });
  };
});
function FJ(X, Q, $, Y) {
  for (let W of X) if (W.issues.length === 0) return (Q.value = W.value), Q;
  return (
    Q.issues.push({
      code: "invalid_union",
      input: Q.value,
      inst: $,
      errors: X.map((W) => W.issues.map((J) => o0(J, Y, u0()))),
    }),
    Q
  );
}
var _4 = O("$ZodUnion", (X, Q) => {
    X0.init(X, Q),
      Y0(X._zod, "optin", () =>
        Q.options.some(($) => $._zod.optin === "optional") ? "optional" : void 0
      ),
      Y0(X._zod, "optout", () =>
        Q.options.some(($) => $._zod.optout === "optional")
          ? "optional"
          : void 0
      ),
      Y0(X._zod, "values", () => {
        if (Q.options.every(($) => $._zod.values))
          return new Set(Q.options.flatMap(($) => Array.from($._zod.values)));
        return;
      }),
      Y0(X._zod, "pattern", () => {
        if (Q.options.every(($) => $._zod.pattern)) {
          let $ = Q.options.map((Y) => Y._zod.pattern);
          return new RegExp(`^(${$.map((Y) => MX(Y.source)).join("|")})$`);
        }
        return;
      }),
      (X._zod.parse = ($, Y) => {
        let W = !1,
          J = [];
        for (let G of Q.options) {
          let H = G._zod.run({ value: $.value, issues: [] }, Y);
          if (H instanceof Promise) J.push(H), (W = !0);
          else {
            if (H.issues.length === 0) return H;
            J.push(H);
          }
        }
        if (!W) return FJ(J, $, X, Y);
        return Promise.all(J).then((G) => {
          return FJ(G, $, X, Y);
        });
      });
  }),
  LQ = O("$ZodDiscriminatedUnion", (X, Q) => {
    _4.init(X, Q);
    let $ = X._zod.parse;
    Y0(X._zod, "propValues", () => {
      let W = {};
      for (let J of Q.options) {
        let G = J._zod.propValues;
        if (!G || Object.keys(G).length === 0)
          throw Error(
            `Invalid discriminated union option at index "${Q.options.indexOf(
              J
            )}"`
          );
        for (let [H, B] of Object.entries(G)) {
          if (!W[H]) W[H] = new Set();
          for (let z of B) W[H].add(z);
        }
      }
      return W;
    });
    let Y = wX(() => {
      let W = Q.options,
        J = new Map();
      for (let G of W) {
        let H = G._zod.propValues[Q.discriminator];
        if (!H || H.size === 0)
          throw Error(
            `Invalid discriminated union option at index "${Q.options.indexOf(
              G
            )}"`
          );
        for (let B of H) {
          if (J.has(B))
            throw Error(`Duplicate discriminator value "${String(B)}"`);
          J.set(B, G);
        }
      }
      return J;
    });
    X._zod.parse = (W, J) => {
      let G = W.value;
      if (!S6(G))
        return (
          W.issues.push({
            code: "invalid_type",
            expected: "object",
            input: G,
            inst: X,
          }),
          W
        );
      let H = Y.value.get(G?.[Q.discriminator]);
      if (H) return H._zod.run(W, J);
      if (Q.unionFallback) return $(W, J);
      return (
        W.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          input: G,
          path: [Q.discriminator],
          inst: X,
        }),
        W
      );
    };
  }),
  qQ = O("$ZodIntersection", (X, Q) => {
    X0.init(X, Q),
      (X._zod.parse = ($, Y) => {
        let W = $.value,
          J = Q.left._zod.run({ value: W, issues: [] }, Y),
          G = Q.right._zod.run({ value: W, issues: [] }, Y);
        if (J instanceof Promise || G instanceof Promise)
          return Promise.all([J, G]).then(([B, z]) => {
            return NJ($, B, z);
          });
        return NJ($, J, G);
      });
  });
function l9(X, Q) {
  if (X === Q) return { valid: !0, data: X };
  if (X instanceof Date && Q instanceof Date && +X === +Q)
    return { valid: !0, data: X };
  if (Z6(X) && Z6(Q)) {
    let $ = Object.keys(Q),
      Y = Object.keys(X).filter((J) => $.indexOf(J) !== -1),
      W = { ...X, ...Q };
    for (let J of Y) {
      let G = l9(X[J], Q[J]);
      if (!G.valid)
        return { valid: !1, mergeErrorPath: [J, ...G.mergeErrorPath] };
      W[J] = G.data;
    }
    return { valid: !0, data: W };
  }
  if (Array.isArray(X) && Array.isArray(Q)) {
    if (X.length !== Q.length) return { valid: !1, mergeErrorPath: [] };
    let $ = [];
    for (let Y = 0; Y < X.length; Y++) {
      let W = X[Y],
        J = Q[Y],
        G = l9(W, J);
      if (!G.valid)
        return { valid: !1, mergeErrorPath: [Y, ...G.mergeErrorPath] };
      $.push(G.data);
    }
    return { valid: !0, data: $ };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function NJ(X, Q, $) {
  if (Q.issues.length) X.issues.push(...Q.issues);
  if ($.issues.length) X.issues.push(...$.issues);
  if (X6(X)) return X;
  let Y = l9(Q.value, $.value);
  if (!Y.valid)
    throw Error(
      `Unmergable intersection. Error path: ${JSON.stringify(Y.mergeErrorPath)}`
    );
  return (X.value = Y.data), X;
}
var FQ = O("$ZodRecord", (X, Q) => {
  X0.init(X, Q),
    (X._zod.parse = ($, Y) => {
      let W = $.value;
      if (!Z6(W))
        return (
          $.issues.push({
            expected: "record",
            code: "invalid_type",
            input: W,
            inst: X,
          }),
          $
        );
      let J = [];
      if (Q.keyType._zod.values) {
        let G = Q.keyType._zod.values;
        $.value = {};
        for (let B of G)
          if (
            typeof B === "string" ||
            typeof B === "number" ||
            typeof B === "symbol"
          ) {
            let z = Q.valueType._zod.run({ value: W[B], issues: [] }, Y);
            if (z instanceof Promise)
              J.push(
                z.then((K) => {
                  if (K.issues.length) $.issues.push(...H1(B, K.issues));
                  $.value[B] = K.value;
                })
              );
            else {
              if (z.issues.length) $.issues.push(...H1(B, z.issues));
              $.value[B] = z.value;
            }
          }
        let H;
        for (let B in W) if (!G.has(B)) (H = H ?? []), H.push(B);
        if (H && H.length > 0)
          $.issues.push({
            code: "unrecognized_keys",
            input: W,
            inst: X,
            keys: H,
          });
      } else {
        $.value = {};
        for (let G of Reflect.ownKeys(W)) {
          if (G === "__proto__") continue;
          let H = Q.keyType._zod.run({ value: G, issues: [] }, Y);
          if (H instanceof Promise)
            throw Error("Async schemas not supported in object keys currently");
          if (H.issues.length) {
            $.issues.push({
              origin: "record",
              code: "invalid_key",
              issues: H.issues.map((z) => o0(z, Y, u0())),
              input: G,
              path: [G],
              inst: X,
            }),
              ($.value[H.value] = H.value);
            continue;
          }
          let B = Q.valueType._zod.run({ value: W[G], issues: [] }, Y);
          if (B instanceof Promise)
            J.push(
              B.then((z) => {
                if (z.issues.length) $.issues.push(...H1(G, z.issues));
                $.value[H.value] = z.value;
              })
            );
          else {
            if (B.issues.length) $.issues.push(...H1(G, B.issues));
            $.value[H.value] = B.value;
          }
        }
      }
      if (J.length) return Promise.all(J).then(() => $);
      return $;
    });
});
var NQ = O("$ZodEnum", (X, Q) => {
    X0.init(X, Q);
    let $ = DX(Q.entries);
    (X._zod.values = new Set($)),
      (X._zod.pattern = new RegExp(
        `^(${$.filter((Y) => I9.has(typeof Y))
          .map((Y) => (typeof Y === "string" ? y1(Y) : Y.toString()))
          .join("|")})$`
      )),
      (X._zod.parse = (Y, W) => {
        let J = Y.value;
        if (X._zod.values.has(J)) return Y;
        return (
          Y.issues.push({
            code: "invalid_value",
            values: $,
            input: J,
            inst: X,
          }),
          Y
        );
      });
  }),
  OQ = O("$ZodLiteral", (X, Q) => {
    X0.init(X, Q),
      (X._zod.values = new Set(Q.values)),
      (X._zod.pattern = new RegExp(
        `^(${Q.values
          .map(($) =>
            typeof $ === "string" ? y1($) : $ ? $.toString() : String($)
          )
          .join("|")})$`
      )),
      (X._zod.parse = ($, Y) => {
        let W = $.value;
        if (X._zod.values.has(W)) return $;
        return (
          $.issues.push({
            code: "invalid_value",
            values: Q.values,
            input: W,
            inst: X,
          }),
          $
        );
      });
  });
var DQ = O("$ZodTransform", (X, Q) => {
    X0.init(X, Q),
      (X._zod.parse = ($, Y) => {
        let W = Q.transform($.value, $);
        if (Y.async)
          return (W instanceof Promise ? W : Promise.resolve(W)).then((G) => {
            return ($.value = G), $;
          });
        if (W instanceof Promise) throw new x1();
        return ($.value = W), $;
      });
  }),
  wQ = O("$ZodOptional", (X, Q) => {
    X0.init(X, Q),
      (X._zod.optin = "optional"),
      (X._zod.optout = "optional"),
      Y0(X._zod, "values", () => {
        return Q.innerType._zod.values
          ? new Set([...Q.innerType._zod.values, void 0])
          : void 0;
      }),
      Y0(X._zod, "pattern", () => {
        let $ = Q.innerType._zod.pattern;
        return $ ? new RegExp(`^(${MX($.source)})?$`) : void 0;
      }),
      (X._zod.parse = ($, Y) => {
        if (Q.innerType._zod.optin === "optional")
          return Q.innerType._zod.run($, Y);
        if ($.value === void 0) return $;
        return Q.innerType._zod.run($, Y);
      });
  }),
  AQ = O("$ZodNullable", (X, Q) => {
    X0.init(X, Q),
      Y0(X._zod, "optin", () => Q.innerType._zod.optin),
      Y0(X._zod, "optout", () => Q.innerType._zod.optout),
      Y0(X._zod, "pattern", () => {
        let $ = Q.innerType._zod.pattern;
        return $ ? new RegExp(`^(${MX($.source)}|null)$`) : void 0;
      }),
      Y0(X._zod, "values", () => {
        return Q.innerType._zod.values
          ? new Set([...Q.innerType._zod.values, null])
          : void 0;
      }),
      (X._zod.parse = ($, Y) => {
        if ($.value === null) return $;
        return Q.innerType._zod.run($, Y);
      });
  }),
  MQ = O("$ZodDefault", (X, Q) => {
    X0.init(X, Q),
      (X._zod.optin = "optional"),
      Y0(X._zod, "values", () => Q.innerType._zod.values),
      (X._zod.parse = ($, Y) => {
        if ($.value === void 0) return ($.value = Q.defaultValue), $;
        let W = Q.innerType._zod.run($, Y);
        if (W instanceof Promise) return W.then((J) => OJ(J, Q));
        return OJ(W, Q);
      });
  });
function OJ(X, Q) {
  if (X.value === void 0) X.value = Q.defaultValue;
  return X;
}
var jQ = O("$ZodPrefault", (X, Q) => {
    X0.init(X, Q),
      (X._zod.optin = "optional"),
      Y0(X._zod, "values", () => Q.innerType._zod.values),
      (X._zod.parse = ($, Y) => {
        if ($.value === void 0) $.value = Q.defaultValue;
        return Q.innerType._zod.run($, Y);
      });
  }),
  RQ = O("$ZodNonOptional", (X, Q) => {
    X0.init(X, Q),
      Y0(X._zod, "values", () => {
        let $ = Q.innerType._zod.values;
        return $ ? new Set([...$].filter((Y) => Y !== void 0)) : void 0;
      }),
      (X._zod.parse = ($, Y) => {
        let W = Q.innerType._zod.run($, Y);
        if (W instanceof Promise) return W.then((J) => DJ(J, X));
        return DJ(W, X);
      });
  });
function DJ(X, Q) {
  if (!X.issues.length && X.value === void 0)
    X.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: X.value,
      inst: Q,
    });
  return X;
}
var IQ = O("$ZodCatch", (X, Q) => {
  X0.init(X, Q),
    (X._zod.optin = "optional"),
    Y0(X._zod, "optout", () => Q.innerType._zod.optout),
    Y0(X._zod, "values", () => Q.innerType._zod.values),
    (X._zod.parse = ($, Y) => {
      let W = Q.innerType._zod.run($, Y);
      if (W instanceof Promise)
        return W.then((J) => {
          if ((($.value = J.value), J.issues.length))
            ($.value = Q.catchValue({
              ...$,
              error: { issues: J.issues.map((G) => o0(G, Y, u0())) },
              input: $.value,
            })),
              ($.issues = []);
          return $;
        });
      if ((($.value = W.value), W.issues.length))
        ($.value = Q.catchValue({
          ...$,
          error: { issues: W.issues.map((J) => o0(J, Y, u0())) },
          input: $.value,
        })),
          ($.issues = []);
      return $;
    });
});
var EQ = O("$ZodPipe", (X, Q) => {
  X0.init(X, Q),
    Y0(X._zod, "values", () => Q.in._zod.values),
    Y0(X._zod, "optin", () => Q.in._zod.optin),
    Y0(X._zod, "optout", () => Q.out._zod.optout),
    (X._zod.parse = ($, Y) => {
      let W = Q.in._zod.run($, Y);
      if (W instanceof Promise) return W.then((J) => wJ(J, Q, Y));
      return wJ(W, Q, Y);
    });
});
function wJ(X, Q, $) {
  if (X6(X)) return X;
  return Q.out._zod.run({ value: X.value, issues: X.issues }, $);
}
var bQ = O("$ZodReadonly", (X, Q) => {
  X0.init(X, Q),
    Y0(X._zod, "propValues", () => Q.innerType._zod.propValues),
    Y0(X._zod, "values", () => Q.innerType._zod.values),
    Y0(X._zod, "optin", () => Q.innerType._zod.optin),
    Y0(X._zod, "optout", () => Q.innerType._zod.optout),
    (X._zod.parse = ($, Y) => {
      let W = Q.innerType._zod.run($, Y);
      if (W instanceof Promise) return W.then(AJ);
      return AJ(W);
    });
});
function AJ(X) {
  return (X.value = Object.freeze(X.value)), X;
}
var PQ = O("$ZodCustom", (X, Q) => {
  A0.init(X, Q),
    X0.init(X, Q),
    (X._zod.parse = ($, Y) => {
      return $;
    }),
    (X._zod.check = ($) => {
      let Y = $.value,
        W = Q.fn(Y);
      if (W instanceof Promise) return W.then((J) => MJ(J, $, Y, X));
      MJ(W, $, Y, X);
      return;
    });
});
function MJ(X, Q, $, Y) {
  if (!X) {
    let W = {
      code: "custom",
      input: $,
      inst: Y,
      path: [...(Y._zod.def.path ?? [])],
      continue: !Y._zod.def.abort,
    };
    if (Y._zod.def.params) W.params = Y._zod.def.params;
    Q.issues.push(P9(W));
  }
}
var sV = (X) => {
    let Q = typeof X;
    switch (Q) {
      case "number":
        return Number.isNaN(X) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(X)) return "array";
        if (X === null) return "null";
        if (Object.getPrototypeOf(X) !== Object.prototype && X.constructor)
          return X.constructor.name;
      }
    }
    return Q;
  },
  eV = () => {
    let X = {
      string: { unit: "characters", verb: "to have" },
      file: { unit: "bytes", verb: "to have" },
      array: { unit: "items", verb: "to have" },
      set: { unit: "items", verb: "to have" },
    };
    function Q(Y) {
      return X[Y] ?? null;
    }
    let $ = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      jwt: "JWT",
      template_literal: "input",
    };
    return (Y) => {
      switch (Y.code) {
        case "invalid_type":
          return `Invalid input: expected ${Y.expected}, received ${sV(
            Y.input
          )}`;
        case "invalid_value":
          if (Y.values.length === 1)
            return `Invalid input: expected ${S4(Y.values[0])}`;
          return `Invalid option: expected one of ${b4(Y.values, "|")}`;
        case "too_big": {
          let W = Y.inclusive ? "<=" : "<",
            J = Q(Y.origin);
          if (J)
            return `Too big: expected ${
              Y.origin ?? "value"
            } to have ${W}${Y.maximum.toString()} ${J.unit ?? "elements"}`;
          return `Too big: expected ${
            Y.origin ?? "value"
          } to be ${W}${Y.maximum.toString()}`;
        }
        case "too_small": {
          let W = Y.inclusive ? ">=" : ">",
            J = Q(Y.origin);
          if (J)
            return `Too small: expected ${
              Y.origin
            } to have ${W}${Y.minimum.toString()} ${J.unit}`;
          return `Too small: expected ${
            Y.origin
          } to be ${W}${Y.minimum.toString()}`;
        }
        case "invalid_format": {
          let W = Y;
          if (W.format === "starts_with")
            return `Invalid string: must start with "${W.prefix}"`;
          if (W.format === "ends_with")
            return `Invalid string: must end with "${W.suffix}"`;
          if (W.format === "includes")
            return `Invalid string: must include "${W.includes}"`;
          if (W.format === "regex")
            return `Invalid string: must match pattern ${W.pattern}`;
          return `Invalid ${$[W.format] ?? Y.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${Y.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${Y.keys.length > 1 ? "s" : ""}: ${b4(
            Y.keys,
            ", "
          )}`;
        case "invalid_key":
          return `Invalid key in ${Y.origin}`;
        case "invalid_union":
          return "Invalid input";
        case "invalid_element":
          return `Invalid value in ${Y.origin}`;
        default:
          return "Invalid input";
      }
    };
  };
function SQ() {
  return { localeError: eV() };
}
var XL = Symbol("ZodOutput"),
  QL = Symbol("ZodInput");
class x4 {
  constructor() {
    (this._map = new WeakMap()), (this._idmap = new Map());
  }
  add(X, ...Q) {
    let $ = Q[0];
    if ((this._map.set(X, $), $ && typeof $ === "object" && "id" in $)) {
      if (this._idmap.has($.id))
        throw Error(`ID ${$.id} already exists in the registry`);
      this._idmap.set($.id, X);
    }
    return this;
  }
  remove(X) {
    return this._map.delete(X), this;
  }
  get(X) {
    let Q = X._zod.parent;
    if (Q) {
      let $ = { ...(this.get(Q) ?? {}) };
      return delete $.id, { ...$, ...this._map.get(X) };
    }
    return this._map.get(X);
  }
  has(X) {
    return this._map.has(X);
  }
}
function PJ() {
  return new x4();
}
var g1 = PJ();
function ZQ(X, Q) {
  return new X({ type: "string", ...y(Q) });
}
function CQ(X, Q) {
  return new X({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function y4(X, Q) {
  return new X({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function kQ(X, Q) {
  return new X({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function vQ(X, Q) {
  return new X({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...y(Q),
  });
}
function TQ(X, Q) {
  return new X({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...y(Q),
  });
}
function _Q(X, Q) {
  return new X({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...y(Q),
  });
}
function xQ(X, Q) {
  return new X({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function yQ(X, Q) {
  return new X({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function gQ(X, Q) {
  return new X({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function fQ(X, Q) {
  return new X({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function hQ(X, Q) {
  return new X({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function uQ(X, Q) {
  return new X({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function lQ(X, Q) {
  return new X({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function mQ(X, Q) {
  return new X({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function cQ(X, Q) {
  return new X({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function pQ(X, Q) {
  return new X({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function dQ(X, Q) {
  return new X({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function iQ(X, Q) {
  return new X({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function nQ(X, Q) {
  return new X({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function rQ(X, Q) {
  return new X({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function oQ(X, Q) {
  return new X({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function tQ(X, Q) {
  return new X({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...y(Q),
  });
}
function SJ(X, Q) {
  return new X({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...y(Q),
  });
}
function ZJ(X, Q) {
  return new X({
    type: "string",
    format: "date",
    check: "string_format",
    ...y(Q),
  });
}
function CJ(X, Q) {
  return new X({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...y(Q),
  });
}
function kJ(X, Q) {
  return new X({
    type: "string",
    format: "duration",
    check: "string_format",
    ...y(Q),
  });
}
function aQ(X, Q) {
  return new X({ type: "number", checks: [], ...y(Q) });
}
function sQ(X, Q) {
  return new X({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...y(Q),
  });
}
function eQ(X, Q) {
  return new X({ type: "boolean", ...y(Q) });
}
function X$(X, Q) {
  return new X({ type: "null", ...y(Q) });
}
function Q$(X) {
  return new X({ type: "unknown" });
}
function $$(X, Q) {
  return new X({ type: "never", ...y(Q) });
}
function g4(X, Q) {
  return new f9({ check: "less_than", ...y(Q), value: X, inclusive: !1 });
}
function bX(X, Q) {
  return new f9({ check: "less_than", ...y(Q), value: X, inclusive: !0 });
}
function f4(X, Q) {
  return new h9({ check: "greater_than", ...y(Q), value: X, inclusive: !1 });
}
function PX(X, Q) {
  return new h9({ check: "greater_than", ...y(Q), value: X, inclusive: !0 });
}
function h4(X, Q) {
  return new eW({ check: "multiple_of", ...y(Q), value: X });
}
function u4(X, Q) {
  return new QJ({ check: "max_length", ...y(Q), maximum: X });
}
function C6(X, Q) {
  return new $J({ check: "min_length", ...y(Q), minimum: X });
}
function l4(X, Q) {
  return new YJ({ check: "length_equals", ...y(Q), length: X });
}
function Y$(X, Q) {
  return new WJ({
    check: "string_format",
    format: "regex",
    ...y(Q),
    pattern: X,
  });
}
function W$(X) {
  return new JJ({ check: "string_format", format: "lowercase", ...y(X) });
}
function J$(X) {
  return new GJ({ check: "string_format", format: "uppercase", ...y(X) });
}
function G$(X, Q) {
  return new HJ({
    check: "string_format",
    format: "includes",
    ...y(Q),
    includes: X,
  });
}
function H$(X, Q) {
  return new BJ({
    check: "string_format",
    format: "starts_with",
    ...y(Q),
    prefix: X,
  });
}
function B$(X, Q) {
  return new zJ({
    check: "string_format",
    format: "ends_with",
    ...y(Q),
    suffix: X,
  });
}
function Y6(X) {
  return new KJ({ check: "overwrite", tx: X });
}
function z$(X) {
  return Y6((Q) => Q.normalize(X));
}
function K$() {
  return Y6((X) => X.trim());
}
function U$() {
  return Y6((X) => X.toLowerCase());
}
function V$() {
  return Y6((X) => X.toUpperCase());
}
function vJ(X, Q, $) {
  return new X({ type: "array", element: Q, ...y($) });
}
function L$(X, Q, $) {
  let Y = y($);
  return (
    Y.abort ?? (Y.abort = !0),
    new X({ type: "custom", check: "custom", fn: Q, ...Y })
  );
}
function q$(X, Q, $) {
  return new X({ type: "custom", check: "custom", fn: Q, ...y($) });
}
class F$ {
  constructor(X) {
    (this.counter = 0),
      (this.metadataRegistry = X?.metadata ?? g1),
      (this.target = X?.target ?? "draft-2020-12"),
      (this.unrepresentable = X?.unrepresentable ?? "throw"),
      (this.override = X?.override ?? (() => {})),
      (this.io = X?.io ?? "output"),
      (this.seen = new Map());
  }
  process(X, Q = { path: [], schemaPath: [] }) {
    var $;
    let Y = X._zod.def,
      W = {
        guid: "uuid",
        url: "uri",
        datetime: "date-time",
        json_string: "json-string",
        regex: "",
      },
      J = this.seen.get(X);
    if (J) {
      if ((J.count++, Q.schemaPath.includes(X))) J.cycle = Q.path;
      return J.schema;
    }
    let G = { schema: {}, count: 1, cycle: void 0, path: Q.path };
    this.seen.set(X, G);
    let H = X._zod.toJSONSchema?.();
    if (H) G.schema = H;
    else {
      let K = { ...Q, schemaPath: [...Q.schemaPath, X], path: Q.path },
        V = X._zod.parent;
      if (V) (G.ref = V), this.process(V, K), (this.seen.get(V).isParent = !0);
      else {
        let L = G.schema;
        switch (Y.type) {
          case "string": {
            let U = L;
            U.type = "string";
            let {
              minimum: F,
              maximum: q,
              format: N,
              patterns: w,
              contentEncoding: M,
            } = X._zod.bag;
            if (typeof F === "number") U.minLength = F;
            if (typeof q === "number") U.maxLength = q;
            if (N) {
              if (((U.format = W[N] ?? N), U.format === "")) delete U.format;
            }
            if (M) U.contentEncoding = M;
            if (w && w.size > 0) {
              let R = [...w];
              if (R.length === 1) U.pattern = R[0].source;
              else if (R.length > 1)
                G.schema.allOf = [
                  ...R.map((S) => ({
                    ...(this.target === "draft-7" ? { type: "string" } : {}),
                    pattern: S.source,
                  })),
                ];
            }
            break;
          }
          case "number": {
            let U = L,
              {
                minimum: F,
                maximum: q,
                format: N,
                multipleOf: w,
                exclusiveMaximum: M,
                exclusiveMinimum: R,
              } = X._zod.bag;
            if (typeof N === "string" && N.includes("int")) U.type = "integer";
            else U.type = "number";
            if (typeof R === "number") U.exclusiveMinimum = R;
            if (typeof F === "number") {
              if (((U.minimum = F), typeof R === "number"))
                if (R >= F) delete U.minimum;
                else delete U.exclusiveMinimum;
            }
            if (typeof M === "number") U.exclusiveMaximum = M;
            if (typeof q === "number") {
              if (((U.maximum = q), typeof M === "number"))
                if (M <= q) delete U.maximum;
                else delete U.exclusiveMaximum;
            }
            if (typeof w === "number") U.multipleOf = w;
            break;
          }
          case "boolean": {
            let U = L;
            U.type = "boolean";
            break;
          }
          case "bigint": {
            if (this.unrepresentable === "throw")
              throw Error("BigInt cannot be represented in JSON Schema");
            break;
          }
          case "symbol": {
            if (this.unrepresentable === "throw")
              throw Error("Symbols cannot be represented in JSON Schema");
            break;
          }
          case "null": {
            L.type = "null";
            break;
          }
          case "any":
            break;
          case "unknown":
            break;
          case "undefined":
          case "never": {
            L.not = {};
            break;
          }
          case "void": {
            if (this.unrepresentable === "throw")
              throw Error("Void cannot be represented in JSON Schema");
            break;
          }
          case "date": {
            if (this.unrepresentable === "throw")
              throw Error("Date cannot be represented in JSON Schema");
            break;
          }
          case "array": {
            let U = L,
              { minimum: F, maximum: q } = X._zod.bag;
            if (typeof F === "number") U.minItems = F;
            if (typeof q === "number") U.maxItems = q;
            (U.type = "array"),
              (U.items = this.process(Y.element, {
                ...K,
                path: [...K.path, "items"],
              }));
            break;
          }
          case "object": {
            let U = L;
            (U.type = "object"), (U.properties = {});
            let F = Y.shape;
            for (let w in F)
              U.properties[w] = this.process(F[w], {
                ...K,
                path: [...K.path, "properties", w],
              });
            let q = new Set(Object.keys(F)),
              N = new Set(
                [...q].filter((w) => {
                  let M = Y.shape[w]._zod;
                  if (this.io === "input") return M.optin === void 0;
                  else return M.optout === void 0;
                })
              );
            if (N.size > 0) U.required = Array.from(N);
            if (Y.catchall?._zod.def.type === "never")
              U.additionalProperties = !1;
            else if (!Y.catchall) {
              if (this.io === "output") U.additionalProperties = !1;
            } else if (Y.catchall)
              U.additionalProperties = this.process(Y.catchall, {
                ...K,
                path: [...K.path, "additionalProperties"],
              });
            break;
          }
          case "union": {
            let U = L;
            U.anyOf = Y.options.map((F, q) =>
              this.process(F, { ...K, path: [...K.path, "anyOf", q] })
            );
            break;
          }
          case "intersection": {
            let U = L,
              F = this.process(Y.left, { ...K, path: [...K.path, "allOf", 0] }),
              q = this.process(Y.right, {
                ...K,
                path: [...K.path, "allOf", 1],
              }),
              N = (M) => "allOf" in M && Object.keys(M).length === 1,
              w = [...(N(F) ? F.allOf : [F]), ...(N(q) ? q.allOf : [q])];
            U.allOf = w;
            break;
          }
          case "tuple": {
            let U = L;
            U.type = "array";
            let F = Y.items.map((w, M) =>
              this.process(w, { ...K, path: [...K.path, "prefixItems", M] })
            );
            if (this.target === "draft-2020-12") U.prefixItems = F;
            else U.items = F;
            if (Y.rest) {
              let w = this.process(Y.rest, {
                ...K,
                path: [...K.path, "items"],
              });
              if (this.target === "draft-2020-12") U.items = w;
              else U.additionalItems = w;
            }
            if (Y.rest)
              U.items = this.process(Y.rest, {
                ...K,
                path: [...K.path, "items"],
              });
            let { minimum: q, maximum: N } = X._zod.bag;
            if (typeof q === "number") U.minItems = q;
            if (typeof N === "number") U.maxItems = N;
            break;
          }
          case "record": {
            let U = L;
            (U.type = "object"),
              (U.propertyNames = this.process(Y.keyType, {
                ...K,
                path: [...K.path, "propertyNames"],
              })),
              (U.additionalProperties = this.process(Y.valueType, {
                ...K,
                path: [...K.path, "additionalProperties"],
              }));
            break;
          }
          case "map": {
            if (this.unrepresentable === "throw")
              throw Error("Map cannot be represented in JSON Schema");
            break;
          }
          case "set": {
            if (this.unrepresentable === "throw")
              throw Error("Set cannot be represented in JSON Schema");
            break;
          }
          case "enum": {
            let U = L,
              F = DX(Y.entries);
            if (F.every((q) => typeof q === "number")) U.type = "number";
            if (F.every((q) => typeof q === "string")) U.type = "string";
            U.enum = F;
            break;
          }
          case "literal": {
            let U = L,
              F = [];
            for (let q of Y.values)
              if (q === void 0) {
                if (this.unrepresentable === "throw")
                  throw Error(
                    "Literal `undefined` cannot be represented in JSON Schema"
                  );
              } else if (typeof q === "bigint")
                if (this.unrepresentable === "throw")
                  throw Error(
                    "BigInt literals cannot be represented in JSON Schema"
                  );
                else F.push(Number(q));
              else F.push(q);
            if (F.length === 0);
            else if (F.length === 1) {
              let q = F[0];
              (U.type = q === null ? "null" : typeof q), (U.const = q);
            } else {
              if (F.every((q) => typeof q === "number")) U.type = "number";
              if (F.every((q) => typeof q === "string")) U.type = "string";
              if (F.every((q) => typeof q === "boolean")) U.type = "string";
              if (F.every((q) => q === null)) U.type = "null";
              U.enum = F;
            }
            break;
          }
          case "file": {
            let U = L,
              F = {
                type: "string",
                format: "binary",
                contentEncoding: "binary",
              },
              { minimum: q, maximum: N, mime: w } = X._zod.bag;
            if (q !== void 0) F.minLength = q;
            if (N !== void 0) F.maxLength = N;
            if (w)
              if (w.length === 1)
                (F.contentMediaType = w[0]), Object.assign(U, F);
              else
                U.anyOf = w.map((M) => {
                  return { ...F, contentMediaType: M };
                });
            else Object.assign(U, F);
            break;
          }
          case "transform": {
            if (this.unrepresentable === "throw")
              throw Error("Transforms cannot be represented in JSON Schema");
            break;
          }
          case "nullable": {
            let U = this.process(Y.innerType, K);
            L.anyOf = [U, { type: "null" }];
            break;
          }
          case "nonoptional": {
            this.process(Y.innerType, K), (G.ref = Y.innerType);
            break;
          }
          case "success": {
            let U = L;
            U.type = "boolean";
            break;
          }
          case "default": {
            this.process(Y.innerType, K),
              (G.ref = Y.innerType),
              (L.default = JSON.parse(JSON.stringify(Y.defaultValue)));
            break;
          }
          case "prefault": {
            if (
              (this.process(Y.innerType, K),
              (G.ref = Y.innerType),
              this.io === "input")
            )
              L._prefault = JSON.parse(JSON.stringify(Y.defaultValue));
            break;
          }
          case "catch": {
            this.process(Y.innerType, K), (G.ref = Y.innerType);
            let U;
            try {
              U = Y.catchValue(void 0);
            } catch {
              throw Error(
                "Dynamic catch values are not supported in JSON Schema"
              );
            }
            L.default = U;
            break;
          }
          case "nan": {
            if (this.unrepresentable === "throw")
              throw Error("NaN cannot be represented in JSON Schema");
            break;
          }
          case "template_literal": {
            let U = L,
              F = X._zod.pattern;
            if (!F) throw Error("Pattern not found in template literal");
            (U.type = "string"), (U.pattern = F.source);
            break;
          }
          case "pipe": {
            let U =
              this.io === "input"
                ? Y.in._zod.def.type === "transform"
                  ? Y.out
                  : Y.in
                : Y.out;
            this.process(U, K), (G.ref = U);
            break;
          }
          case "readonly": {
            this.process(Y.innerType, K),
              (G.ref = Y.innerType),
              (L.readOnly = !0);
            break;
          }
          case "promise": {
            this.process(Y.innerType, K), (G.ref = Y.innerType);
            break;
          }
          case "optional": {
            this.process(Y.innerType, K), (G.ref = Y.innerType);
            break;
          }
          case "lazy": {
            let U = X._zod.innerType;
            this.process(U, K), (G.ref = U);
            break;
          }
          case "custom": {
            if (this.unrepresentable === "throw")
              throw Error("Custom types cannot be represented in JSON Schema");
            break;
          }
          default:
        }
      }
    }
    let B = this.metadataRegistry.get(X);
    if (B) Object.assign(G.schema, B);
    if (this.io === "input" && w0(X))
      delete G.schema.examples, delete G.schema.default;
    if (this.io === "input" && G.schema._prefault)
      ($ = G.schema).default ?? ($.default = G.schema._prefault);
    return delete G.schema._prefault, this.seen.get(X).schema;
  }
  emit(X, Q) {
    let $ = {
        cycles: Q?.cycles ?? "ref",
        reused: Q?.reused ?? "inline",
        external: Q?.external ?? void 0,
      },
      Y = this.seen.get(X);
    if (!Y) throw Error("Unprocessed schema. This is a bug in Zod.");
    let W = (z) => {
        let K = this.target === "draft-2020-12" ? "$defs" : "definitions";
        if ($.external) {
          let F = $.external.registry.get(z[0])?.id;
          if (F) return { ref: $.external.uri(F) };
          let q = z[1].defId ?? z[1].schema.id ?? `schema${this.counter++}`;
          return (
            (z[1].defId = q),
            { defId: q, ref: `${$.external.uri("__shared")}#/${K}/${q}` }
          );
        }
        if (z[1] === Y) return { ref: "#" };
        let L = `${"#"}/${K}/`,
          U = z[1].schema.id ?? `__schema${this.counter++}`;
        return { defId: U, ref: L + U };
      },
      J = (z) => {
        if (z[1].schema.$ref) return;
        let K = z[1],
          { ref: V, defId: L } = W(z);
        if (((K.def = { ...K.schema }), L)) K.defId = L;
        let U = K.schema;
        for (let F in U) delete U[F];
        U.$ref = V;
      };
    for (let z of this.seen.entries()) {
      let K = z[1];
      if (X === z[0]) {
        J(z);
        continue;
      }
      if ($.external) {
        let L = $.external.registry.get(z[0])?.id;
        if (X !== z[0] && L) {
          J(z);
          continue;
        }
      }
      if (this.metadataRegistry.get(z[0])?.id) {
        J(z);
        continue;
      }
      if (K.cycle) {
        if ($.cycles === "throw")
          throw Error(`Cycle detected: #/${K.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        else if ($.cycles === "ref") J(z);
        continue;
      }
      if (K.count > 1) {
        if ($.reused === "ref") {
          J(z);
          continue;
        }
      }
    }
    let G = (z, K) => {
      let V = this.seen.get(z),
        L = V.def ?? V.schema,
        U = { ...L };
      if (V.ref === null) return;
      let F = V.ref;
      if (((V.ref = null), F)) {
        G(F, K);
        let q = this.seen.get(F).schema;
        if (q.$ref && K.target === "draft-7")
          (L.allOf = L.allOf ?? []), L.allOf.push(q);
        else Object.assign(L, q), Object.assign(L, U);
      }
      if (!V.isParent)
        this.override({ zodSchema: z, jsonSchema: L, path: V.path ?? [] });
    };
    for (let z of [...this.seen.entries()].reverse())
      G(z[0], { target: this.target });
    let H = {};
    if (this.target === "draft-2020-12")
      H.$schema = "https://json-schema.org/draft/2020-12/schema";
    else if (this.target === "draft-7")
      H.$schema = "http://json-schema.org/draft-07/schema#";
    else console.warn(`Invalid target: ${this.target}`);
    Object.assign(H, Y.def);
    let B = $.external?.defs ?? {};
    for (let z of this.seen.entries()) {
      let K = z[1];
      if (K.def && K.defId) B[K.defId] = K.def;
    }
    if (!$.external && Object.keys(B).length > 0)
      if (this.target === "draft-2020-12") H.$defs = B;
      else H.definitions = B;
    try {
      return JSON.parse(JSON.stringify(H));
    } catch (z) {
      throw Error("Error converting schema to JSON.");
    }
  }
}
function N$(X, Q) {
  if (X instanceof x4) {
    let Y = new F$(Q),
      W = {};
    for (let H of X._idmap.entries()) {
      let [B, z] = H;
      Y.process(z);
    }
    let J = {},
      G = { registry: X, uri: Q?.uri || ((H) => H), defs: W };
    for (let H of X._idmap.entries()) {
      let [B, z] = H;
      J[B] = Y.emit(z, { ...Q, external: G });
    }
    if (Object.keys(W).length > 0) {
      let H = Y.target === "draft-2020-12" ? "$defs" : "definitions";
      J.__shared = { [H]: W };
    }
    return { schemas: J };
  }
  let $ = new F$(Q);
  return $.process(X), $.emit(X, Q);
}
function w0(X, Q) {
  let $ = Q ?? { seen: new Set() };
  if ($.seen.has(X)) return !1;
  $.seen.add(X);
  let W = X._zod.def;
  switch (W.type) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "date":
    case "symbol":
    case "undefined":
    case "null":
    case "any":
    case "unknown":
    case "never":
    case "void":
    case "literal":
    case "enum":
    case "nan":
    case "file":
    case "template_literal":
      return !1;
    case "array":
      return w0(W.element, $);
    case "object": {
      for (let J in W.shape) if (w0(W.shape[J], $)) return !0;
      return !1;
    }
    case "union": {
      for (let J of W.options) if (w0(J, $)) return !0;
      return !1;
    }
    case "intersection":
      return w0(W.left, $) || w0(W.right, $);
    case "tuple": {
      for (let J of W.items) if (w0(J, $)) return !0;
      if (W.rest && w0(W.rest, $)) return !0;
      return !1;
    }
    case "record":
      return w0(W.keyType, $) || w0(W.valueType, $);
    case "map":
      return w0(W.keyType, $) || w0(W.valueType, $);
    case "set":
      return w0(W.valueType, $);
    case "promise":
    case "optional":
    case "nonoptional":
    case "nullable":
    case "readonly":
      return w0(W.innerType, $);
    case "lazy":
      return w0(W.getter(), $);
    case "default":
      return w0(W.innerType, $);
    case "prefault":
      return w0(W.innerType, $);
    case "custom":
      return !1;
    case "transform":
      return !0;
    case "pipe":
      return w0(W.in, $) || w0(W.out, $);
    case "success":
      return !1;
    case "catch":
      return !1;
    default:
  }
  throw Error(`Unknown schema type: ${W.type}`);
}
var yL = O("ZodMiniType", (X, Q) => {
  if (!X._zod) throw Error("Uninitialized schema in ZodMiniType.");
  X0.init(X, Q),
    (X.def = Q),
    (X.parse = ($, Y) => k9(X, $, Y, { callee: X.parse })),
    (X.safeParse = ($, Y) => Q6(X, $, Y)),
    (X.parseAsync = async ($, Y) => T9(X, $, Y, { callee: X.parseAsync })),
    (X.safeParseAsync = async ($, Y) => $6(X, $, Y)),
    (X.check = (...$) => {
      return X.clone({
        ...Q,
        checks: [
          ...(Q.checks ?? []),
          ...$.map((Y) =>
            typeof Y === "function"
              ? { _zod: { check: Y, def: { check: "custom" }, onattach: [] } }
              : Y
          ),
        ],
      });
    }),
    (X.clone = ($, Y) => l0(X, $, Y)),
    (X.brand = () => X),
    (X.register = ($, Y) => {
      return $.add(X, Y), X;
    });
});
var gL = O("ZodMiniObject", (X, Q) => {
  T4.init(X, Q), yL.init(X, Q), i.defineLazy(X, "shape", () => Q.shape);
});
function O$(X, Q) {
  let $ = {
    type: "object",
    get shape() {
      return i.assignProp(this, "shape", { ...X }), this.shape;
    },
    ...i.normalizeParams(Q),
  };
  return new gL($);
}
function m0(X) {
  return !!X._zod;
}
function k6(X) {
  let Q = Object.values(X);
  if (Q.length === 0) return O$({});
  let $ = Q.every(m0),
    Y = Q.every((W) => !m0(W));
  if ($) return O$(X);
  if (Y) return OW(X);
  throw Error("Mixed Zod versions detected in object shape.");
}
function f1(X, Q) {
  if (m0(X)) return Q6(X, Q);
  return X.safeParse(Q);
}
async function m4(X, Q) {
  if (m0(X)) return await $6(X, Q);
  return await X.safeParseAsync(Q);
}
function h1(X) {
  var Q, $;
  if (!X) return;
  let Y;
  if (m0(X))
    Y =
      ($ = (Q = X._zod) === null || Q === void 0 ? void 0 : Q.def) === null ||
      $ === void 0
        ? void 0
        : $.shape;
  else Y = X.shape;
  if (!Y) return;
  if (typeof Y === "function")
    try {
      return Y();
    } catch (W) {
      return;
    }
  return Y;
}
function v6(X) {
  var Q;
  if (!X) return;
  if (typeof X === "object") {
    let $ = X,
      Y = X;
    if (!$._def && !Y._zod) {
      let W = Object.values(X);
      if (
        W.length > 0 &&
        W.every(
          (J) =>
            typeof J === "object" &&
            J !== null &&
            (J._def !== void 0 ||
              J._zod !== void 0 ||
              typeof J.parse === "function")
        )
      )
        return k6(X);
    }
  }
  if (m0(X)) {
    let Y = (Q = X._zod) === null || Q === void 0 ? void 0 : Q.def;
    if (Y && (Y.type === "object" || Y.shape !== void 0)) return X;
  } else if (X.shape !== void 0) return X;
  return;
}
function c4(X) {
  if (X && typeof X === "object") {
    if ("message" in X && typeof X.message === "string") return X.message;
    if ("issues" in X && Array.isArray(X.issues) && X.issues.length > 0) {
      let Q = X.issues[0];
      if (Q && typeof Q === "object" && "message" in Q)
        return String(Q.message);
    }
    try {
      return JSON.stringify(X);
    } catch (Q) {
      return String(X);
    }
  }
  return String(X);
}
function _J(X) {
  var Q, $, Y, W;
  if (m0(X))
    return ($ = (Q = X._zod) === null || Q === void 0 ? void 0 : Q.def) ===
      null || $ === void 0
      ? void 0
      : $.description;
  let J = X;
  return (Y = X.description) !== null && Y !== void 0
    ? Y
    : (W = J._def) === null || W === void 0
    ? void 0
    : W.description;
}
function xJ(X) {
  var Q, $, Y;
  if (m0(X))
    return (
      (($ = (Q = X._zod) === null || Q === void 0 ? void 0 : Q.def) === null ||
      $ === void 0
        ? void 0
        : $.type) === "optional"
    );
  let W = X;
  if (typeof X.isOptional === "function") return X.isOptional();
  return (
    ((Y = W._def) === null || Y === void 0 ? void 0 : Y.typeName) ===
    "ZodOptional"
  );
}
function p4(X) {
  var Q;
  if (m0(X)) {
    let G = (Q = X._zod) === null || Q === void 0 ? void 0 : Q.def;
    if (G) {
      if (G.value !== void 0) return G.value;
      if (Array.isArray(G.values) && G.values.length > 0) return G.values[0];
    }
  }
  let Y = X._def;
  if (Y) {
    if (Y.value !== void 0) return Y.value;
    if (Array.isArray(Y.values) && Y.values.length > 0) return Y.values[0];
  }
  let W = X.value;
  if (W !== void 0) return W;
  return;
}
var SX = {};
U7(SX, {
  time: () => A$,
  duration: () => M$,
  datetime: () => D$,
  date: () => w$,
  ZodISOTime: () => fJ,
  ZodISODuration: () => hJ,
  ZodISODateTime: () => yJ,
  ZodISODate: () => gJ,
});
var yJ = O("ZodISODateTime", (X, Q) => {
  jJ.init(X, Q), H0.init(X, Q);
});
function D$(X) {
  return SJ(yJ, X);
}
var gJ = O("ZodISODate", (X, Q) => {
  RJ.init(X, Q), H0.init(X, Q);
});
function w$(X) {
  return ZJ(gJ, X);
}
var fJ = O("ZodISOTime", (X, Q) => {
  IJ.init(X, Q), H0.init(X, Q);
});
function A$(X) {
  return CJ(fJ, X);
}
var hJ = O("ZodISODuration", (X, Q) => {
  EJ.init(X, Q), H0.init(X, Q);
});
function M$(X) {
  return kJ(hJ, X);
}
var uJ = (X, Q) => {
    Z4.init(X, Q),
      (X.name = "ZodError"),
      Object.defineProperties(X, {
        format: { value: ($) => Z9(X, $) },
        flatten: { value: ($) => S9(X, $) },
        addIssue: { value: ($) => X.issues.push($) },
        addIssues: { value: ($) => X.issues.push(...$) },
        isEmpty: {
          get() {
            return X.issues.length === 0;
          },
        },
      });
  },
  HZ = O("ZodError", uJ),
  ZX = O("ZodError", uJ, { Parent: Error });
var lJ = C9(ZX),
  mJ = v9(ZX),
  cJ = _9(ZX),
  pJ = x9(ZX);
var z0 = O("ZodType", (X, Q) => {
    return (
      X0.init(X, Q),
      (X.def = Q),
      Object.defineProperty(X, "_def", { value: Q }),
      (X.check = (...$) => {
        return X.clone({
          ...Q,
          checks: [
            ...(Q.checks ?? []),
            ...$.map((Y) =>
              typeof Y === "function"
                ? { _zod: { check: Y, def: { check: "custom" }, onattach: [] } }
                : Y
            ),
          ],
        });
      }),
      (X.clone = ($, Y) => l0(X, $, Y)),
      (X.brand = () => X),
      (X.register = ($, Y) => {
        return $.add(X, Y), X;
      }),
      (X.parse = ($, Y) => lJ(X, $, Y, { callee: X.parse })),
      (X.safeParse = ($, Y) => cJ(X, $, Y)),
      (X.parseAsync = async ($, Y) => mJ(X, $, Y, { callee: X.parseAsync })),
      (X.safeParseAsync = async ($, Y) => pJ(X, $, Y)),
      (X.spa = X.safeParseAsync),
      (X.refine = ($, Y) => X.check(_q($, Y))),
      (X.superRefine = ($) => X.check(xq($))),
      (X.overwrite = ($) => X.check(Y6($))),
      (X.optional = () => v(X)),
      (X.nullable = () => nJ(X)),
      (X.nullish = () => v(nJ(X))),
      (X.nonoptional = ($) => Pq(X, $)),
      (X.array = () => r(X)),
      (X.or = ($) => J0([X, $])),
      (X.and = ($) => i4(X, $)),
      (X.transform = ($) => R$(X, sJ($))),
      (X.default = ($) => Iq(X, $)),
      (X.prefault = ($) => bq(X, $)),
      (X.catch = ($) => Zq(X, $)),
      (X.pipe = ($) => R$(X, $)),
      (X.readonly = () => vq(X)),
      (X.describe = ($) => {
        let Y = X.clone();
        return g1.add(Y, { description: $ }), Y;
      }),
      Object.defineProperty(X, "description", {
        get() {
          return g1.get(X)?.description;
        },
        configurable: !0,
      }),
      (X.meta = (...$) => {
        if ($.length === 0) return g1.get(X);
        let Y = X.clone();
        return g1.add(Y, $[0]), Y;
      }),
      (X.isOptional = () => X.safeParse(void 0).success),
      (X.isNullable = () => X.safeParse(null).success),
      X
    );
  }),
  rJ = O("_ZodString", (X, Q) => {
    EX.init(X, Q), z0.init(X, Q);
    let $ = X._zod.bag;
    (X.format = $.format ?? null),
      (X.minLength = $.minimum ?? null),
      (X.maxLength = $.maximum ?? null),
      (X.regex = (...Y) => X.check(Y$(...Y))),
      (X.includes = (...Y) => X.check(G$(...Y))),
      (X.startsWith = (...Y) => X.check(H$(...Y))),
      (X.endsWith = (...Y) => X.check(B$(...Y))),
      (X.min = (...Y) => X.check(C6(...Y))),
      (X.max = (...Y) => X.check(u4(...Y))),
      (X.length = (...Y) => X.check(l4(...Y))),
      (X.nonempty = (...Y) => X.check(C6(1, ...Y))),
      (X.lowercase = (Y) => X.check(W$(Y))),
      (X.uppercase = (Y) => X.check(J$(Y))),
      (X.trim = () => X.check(K$())),
      (X.normalize = (...Y) => X.check(z$(...Y))),
      (X.toLowerCase = () => X.check(U$())),
      (X.toUpperCase = () => X.check(V$()));
  }),
  iL = O("ZodString", (X, Q) => {
    EX.init(X, Q),
      rJ.init(X, Q),
      (X.email = ($) => X.check(CQ(nL, $))),
      (X.url = ($) => X.check(xQ(rL, $))),
      (X.jwt = ($) => X.check(tQ(zq, $))),
      (X.emoji = ($) => X.check(yQ(oL, $))),
      (X.guid = ($) => X.check(y4(dJ, $))),
      (X.uuid = ($) => X.check(kQ(d4, $))),
      (X.uuidv4 = ($) => X.check(vQ(d4, $))),
      (X.uuidv6 = ($) => X.check(TQ(d4, $))),
      (X.uuidv7 = ($) => X.check(_Q(d4, $))),
      (X.nanoid = ($) => X.check(gQ(tL, $))),
      (X.guid = ($) => X.check(y4(dJ, $))),
      (X.cuid = ($) => X.check(fQ(aL, $))),
      (X.cuid2 = ($) => X.check(hQ(sL, $))),
      (X.ulid = ($) => X.check(uQ(eL, $))),
      (X.base64 = ($) => X.check(nQ(Gq, $))),
      (X.base64url = ($) => X.check(rQ(Hq, $))),
      (X.xid = ($) => X.check(lQ(Xq, $))),
      (X.ksuid = ($) => X.check(mQ(Qq, $))),
      (X.ipv4 = ($) => X.check(cQ($q, $))),
      (X.ipv6 = ($) => X.check(pQ(Yq, $))),
      (X.cidrv4 = ($) => X.check(dQ(Wq, $))),
      (X.cidrv6 = ($) => X.check(iQ(Jq, $))),
      (X.e164 = ($) => X.check(oQ(Bq, $))),
      (X.datetime = ($) => X.check(D$($))),
      (X.date = ($) => X.check(w$($))),
      (X.time = ($) => X.check(A$($))),
      (X.duration = ($) => X.check(M$($)));
  });
function D(X) {
  return ZQ(iL, X);
}
var H0 = O("ZodStringFormat", (X, Q) => {
    W0.init(X, Q), rJ.init(X, Q);
  }),
  nL = O("ZodEmail", (X, Q) => {
    p9.init(X, Q), H0.init(X, Q);
  });
var dJ = O("ZodGUID", (X, Q) => {
  m9.init(X, Q), H0.init(X, Q);
});
var d4 = O("ZodUUID", (X, Q) => {
  c9.init(X, Q), H0.init(X, Q);
});
var rL = O("ZodURL", (X, Q) => {
  d9.init(X, Q), H0.init(X, Q);
});
var oL = O("ZodEmoji", (X, Q) => {
  i9.init(X, Q), H0.init(X, Q);
});
var tL = O("ZodNanoID", (X, Q) => {
  n9.init(X, Q), H0.init(X, Q);
});
var aL = O("ZodCUID", (X, Q) => {
  r9.init(X, Q), H0.init(X, Q);
});
var sL = O("ZodCUID2", (X, Q) => {
  o9.init(X, Q), H0.init(X, Q);
});
var eL = O("ZodULID", (X, Q) => {
  t9.init(X, Q), H0.init(X, Q);
});
var Xq = O("ZodXID", (X, Q) => {
  a9.init(X, Q), H0.init(X, Q);
});
var Qq = O("ZodKSUID", (X, Q) => {
  s9.init(X, Q), H0.init(X, Q);
});
var $q = O("ZodIPv4", (X, Q) => {
  e9.init(X, Q), H0.init(X, Q);
});
var Yq = O("ZodIPv6", (X, Q) => {
  XQ.init(X, Q), H0.init(X, Q);
});
var Wq = O("ZodCIDRv4", (X, Q) => {
  QQ.init(X, Q), H0.init(X, Q);
});
var Jq = O("ZodCIDRv6", (X, Q) => {
  $Q.init(X, Q), H0.init(X, Q);
});
var Gq = O("ZodBase64", (X, Q) => {
  YQ.init(X, Q), H0.init(X, Q);
});
var Hq = O("ZodBase64URL", (X, Q) => {
  WQ.init(X, Q), H0.init(X, Q);
});
var Bq = O("ZodE164", (X, Q) => {
  JQ.init(X, Q), H0.init(X, Q);
});
var zq = O("ZodJWT", (X, Q) => {
  GQ.init(X, Q), H0.init(X, Q);
});
var oJ = O("ZodNumber", (X, Q) => {
  v4.init(X, Q),
    z0.init(X, Q),
    (X.gt = (Y, W) => X.check(f4(Y, W))),
    (X.gte = (Y, W) => X.check(PX(Y, W))),
    (X.min = (Y, W) => X.check(PX(Y, W))),
    (X.lt = (Y, W) => X.check(g4(Y, W))),
    (X.lte = (Y, W) => X.check(bX(Y, W))),
    (X.max = (Y, W) => X.check(bX(Y, W))),
    (X.int = (Y) => X.check(iJ(Y))),
    (X.safe = (Y) => X.check(iJ(Y))),
    (X.positive = (Y) => X.check(f4(0, Y))),
    (X.nonnegative = (Y) => X.check(PX(0, Y))),
    (X.negative = (Y) => X.check(g4(0, Y))),
    (X.nonpositive = (Y) => X.check(bX(0, Y))),
    (X.multipleOf = (Y, W) => X.check(h4(Y, W))),
    (X.step = (Y, W) => X.check(h4(Y, W))),
    (X.finite = () => X);
  let $ = X._zod.bag;
  (X.minValue =
    Math.max(
      $.minimum ?? Number.NEGATIVE_INFINITY,
      $.exclusiveMinimum ?? Number.NEGATIVE_INFINITY
    ) ?? null),
    (X.maxValue =
      Math.min(
        $.maximum ?? Number.POSITIVE_INFINITY,
        $.exclusiveMaximum ?? Number.POSITIVE_INFINITY
      ) ?? null),
    (X.isInt =
      ($.format ?? "").includes("int") ||
      Number.isSafeInteger($.multipleOf ?? 0.5)),
    (X.isFinite = !0),
    (X.format = $.format ?? null);
});
function Q0(X) {
  return aQ(oJ, X);
}
var Kq = O("ZodNumberFormat", (X, Q) => {
  HQ.init(X, Q), oJ.init(X, Q);
});
function iJ(X) {
  return sQ(Kq, X);
}
var Uq = O("ZodBoolean", (X, Q) => {
  BQ.init(X, Q), z0.init(X, Q);
});
function M0(X) {
  return eQ(Uq, X);
}
var Vq = O("ZodNull", (X, Q) => {
  zQ.init(X, Q), z0.init(X, Q);
});
function I$(X) {
  return X$(Vq, X);
}
var Lq = O("ZodUnknown", (X, Q) => {
  KQ.init(X, Q), z0.init(X, Q);
});
function N0() {
  return Q$(Lq);
}
var qq = O("ZodNever", (X, Q) => {
  UQ.init(X, Q), z0.init(X, Q);
});
function Fq(X) {
  return $$(qq, X);
}
var Nq = O("ZodArray", (X, Q) => {
  VQ.init(X, Q),
    z0.init(X, Q),
    (X.element = Q.element),
    (X.min = ($, Y) => X.check(C6($, Y))),
    (X.nonempty = ($) => X.check(C6(1, $))),
    (X.max = ($, Y) => X.check(u4($, Y))),
    (X.length = ($, Y) => X.check(l4($, Y))),
    (X.unwrap = () => X.element);
});
function r(X, Q) {
  return vJ(Nq, X, Q);
}
var tJ = O("ZodObject", (X, Q) => {
  T4.init(X, Q),
    z0.init(X, Q),
    i.defineLazy(X, "shape", () => Q.shape),
    (X.keyof = () => j0(Object.keys(X._zod.def.shape))),
    (X.catchall = ($) => X.clone({ ...X._zod.def, catchall: $ })),
    (X.passthrough = () => X.clone({ ...X._zod.def, catchall: N0() })),
    (X.loose = () => X.clone({ ...X._zod.def, catchall: N0() })),
    (X.strict = () => X.clone({ ...X._zod.def, catchall: Fq() })),
    (X.strip = () => X.clone({ ...X._zod.def, catchall: void 0 })),
    (X.extend = ($) => {
      return i.extend(X, $);
    }),
    (X.merge = ($) => i.merge(X, $)),
    (X.pick = ($) => i.pick(X, $)),
    (X.omit = ($) => i.omit(X, $)),
    (X.partial = (...$) => i.partial(eJ, X, $[0])),
    (X.required = (...$) => i.required(X5, X, $[0]));
});
function E(X, Q) {
  let $ = {
    type: "object",
    get shape() {
      return i.assignProp(this, "shape", { ...X }), this.shape;
    },
    ...i.normalizeParams(Q),
  };
  return new tJ($);
}
function c0(X, Q) {
  return new tJ({
    type: "object",
    get shape() {
      return i.assignProp(this, "shape", { ...X }), this.shape;
    },
    catchall: N0(),
    ...i.normalizeParams(Q),
  });
}
var aJ = O("ZodUnion", (X, Q) => {
  _4.init(X, Q), z0.init(X, Q), (X.options = Q.options);
});
function J0(X, Q) {
  return new aJ({ type: "union", options: X, ...i.normalizeParams(Q) });
}
var Oq = O("ZodDiscriminatedUnion", (X, Q) => {
  aJ.init(X, Q), LQ.init(X, Q);
});
function E$(X, Q, $) {
  return new Oq({
    type: "union",
    options: Q,
    discriminator: X,
    ...i.normalizeParams($),
  });
}
var Dq = O("ZodIntersection", (X, Q) => {
  qQ.init(X, Q), z0.init(X, Q);
});
function i4(X, Q) {
  return new Dq({ type: "intersection", left: X, right: Q });
}
var wq = O("ZodRecord", (X, Q) => {
  FQ.init(X, Q),
    z0.init(X, Q),
    (X.keyType = Q.keyType),
    (X.valueType = Q.valueType);
});
function O0(X, Q, $) {
  return new wq({
    type: "record",
    keyType: X,
    valueType: Q,
    ...i.normalizeParams($),
  });
}
var j$ = O("ZodEnum", (X, Q) => {
  NQ.init(X, Q),
    z0.init(X, Q),
    (X.enum = Q.entries),
    (X.options = Object.values(Q.entries));
  let $ = new Set(Object.keys(Q.entries));
  (X.extract = (Y, W) => {
    let J = {};
    for (let G of Y)
      if ($.has(G)) J[G] = Q.entries[G];
      else throw Error(`Key ${G} not found in enum`);
    return new j$({ ...Q, checks: [], ...i.normalizeParams(W), entries: J });
  }),
    (X.exclude = (Y, W) => {
      let J = { ...Q.entries };
      for (let G of Y)
        if ($.has(G)) delete J[G];
        else throw Error(`Key ${G} not found in enum`);
      return new j$({ ...Q, checks: [], ...i.normalizeParams(W), entries: J });
    });
});
function j0(X, Q) {
  let $ = Array.isArray(X) ? Object.fromEntries(X.map((Y) => [Y, Y])) : X;
  return new j$({ type: "enum", entries: $, ...i.normalizeParams(Q) });
}
var Aq = O("ZodLiteral", (X, Q) => {
  OQ.init(X, Q),
    z0.init(X, Q),
    (X.values = new Set(Q.values)),
    Object.defineProperty(X, "value", {
      get() {
        if (Q.values.length > 1)
          throw Error(
            "This schema contains multiple valid literal values. Use `.values` instead."
          );
        return Q.values[0];
      },
    });
});
function T(X, Q) {
  return new Aq({
    type: "literal",
    values: Array.isArray(X) ? X : [X],
    ...i.normalizeParams(Q),
  });
}
var Mq = O("ZodTransform", (X, Q) => {
  DQ.init(X, Q),
    z0.init(X, Q),
    (X._zod.parse = ($, Y) => {
      $.addIssue = (J) => {
        if (typeof J === "string") $.issues.push(i.issue(J, $.value, Q));
        else {
          let G = J;
          if (G.fatal) G.continue = !1;
          G.code ?? (G.code = "custom"),
            G.input ?? (G.input = $.value),
            G.inst ?? (G.inst = X),
            G.continue ?? (G.continue = !0),
            $.issues.push(i.issue(G));
        }
      };
      let W = Q.transform($.value, $);
      if (W instanceof Promise)
        return W.then((J) => {
          return ($.value = J), $;
        });
      return ($.value = W), $;
    });
});
function sJ(X) {
  return new Mq({ type: "transform", transform: X });
}
var eJ = O("ZodOptional", (X, Q) => {
  wQ.init(X, Q), z0.init(X, Q), (X.unwrap = () => X._zod.def.innerType);
});
function v(X) {
  return new eJ({ type: "optional", innerType: X });
}
var jq = O("ZodNullable", (X, Q) => {
  AQ.init(X, Q), z0.init(X, Q), (X.unwrap = () => X._zod.def.innerType);
});
function nJ(X) {
  return new jq({ type: "nullable", innerType: X });
}
var Rq = O("ZodDefault", (X, Q) => {
  MQ.init(X, Q),
    z0.init(X, Q),
    (X.unwrap = () => X._zod.def.innerType),
    (X.removeDefault = X.unwrap);
});
function Iq(X, Q) {
  return new Rq({
    type: "default",
    innerType: X,
    get defaultValue() {
      return typeof Q === "function" ? Q() : Q;
    },
  });
}
var Eq = O("ZodPrefault", (X, Q) => {
  jQ.init(X, Q), z0.init(X, Q), (X.unwrap = () => X._zod.def.innerType);
});
function bq(X, Q) {
  return new Eq({
    type: "prefault",
    innerType: X,
    get defaultValue() {
      return typeof Q === "function" ? Q() : Q;
    },
  });
}
var X5 = O("ZodNonOptional", (X, Q) => {
  RQ.init(X, Q), z0.init(X, Q), (X.unwrap = () => X._zod.def.innerType);
});
function Pq(X, Q) {
  return new X5({ type: "nonoptional", innerType: X, ...i.normalizeParams(Q) });
}
var Sq = O("ZodCatch", (X, Q) => {
  IQ.init(X, Q),
    z0.init(X, Q),
    (X.unwrap = () => X._zod.def.innerType),
    (X.removeCatch = X.unwrap);
});
function Zq(X, Q) {
  return new Sq({
    type: "catch",
    innerType: X,
    catchValue: typeof Q === "function" ? Q : () => Q,
  });
}
var Cq = O("ZodPipe", (X, Q) => {
  EQ.init(X, Q), z0.init(X, Q), (X.in = Q.in), (X.out = Q.out);
});
function R$(X, Q) {
  return new Cq({ type: "pipe", in: X, out: Q });
}
var kq = O("ZodReadonly", (X, Q) => {
  bQ.init(X, Q), z0.init(X, Q);
});
function vq(X) {
  return new kq({ type: "readonly", innerType: X });
}
var Q5 = O("ZodCustom", (X, Q) => {
  PQ.init(X, Q), z0.init(X, Q);
});
function Tq(X, Q) {
  let $ = new A0({ check: "custom", ...i.normalizeParams(Q) });
  return ($._zod.check = X), $;
}
function $5(X, Q) {
  return L$(Q5, X ?? (() => !0), Q);
}
function _q(X, Q = {}) {
  return q$(Q5, X, Q);
}
function xq(X, Q) {
  let $ = Tq((Y) => {
    return (
      (Y.addIssue = (W) => {
        if (typeof W === "string")
          Y.issues.push(i.issue(W, Y.value, $._zod.def));
        else {
          let J = W;
          if (J.fatal) J.continue = !1;
          J.code ?? (J.code = "custom"),
            J.input ?? (J.input = Y.value),
            J.inst ?? (J.inst = $),
            J.continue ?? (J.continue = !$._zod.def.abort),
            Y.issues.push(i.issue(J));
        }
      }),
      X(Y.value, Y)
    );
  }, Q);
  return $;
}
function b$(X, Q) {
  return R$(sJ(X), Q);
}
u0(SQ());
var P$ = "2025-11-25";
var Y5 = [P$, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"],
  z1 = "io.modelcontextprotocol/related-task",
  r4 = "2.0",
  B1 = $5(
    (X) => X !== null && (typeof X === "object" || typeof X === "function")
  ),
  W5 = J0([D(), Q0().int()]),
  J5 = D(),
  yq = c0({ ttl: J0([Q0(), I$()]).optional(), pollInterval: Q0().optional() }),
  S$ = c0({ taskId: D() }),
  gq = c0({ progressToken: W5.optional(), [z1]: S$.optional() }),
  _0 = c0({ task: yq.optional(), _meta: gq.optional() }),
  R0 = E({ method: D(), params: _0.optional() }),
  J6 = c0({
    _meta: E({ [z1]: v(S$) })
      .passthrough()
      .optional(),
  }),
  p0 = E({ method: D(), params: J6.optional() }),
  P0 = c0({ _meta: c0({ [z1]: S$.optional() }).optional() }),
  o4 = J0([D(), Q0().int()]),
  G5 = E({ jsonrpc: T(r4), id: o4, ...R0.shape }).strict(),
  Z$ = (X) => G5.safeParse(X).success,
  H5 = E({ jsonrpc: T(r4), ...p0.shape }).strict(),
  B5 = (X) => H5.safeParse(X).success,
  z5 = E({ jsonrpc: T(r4), id: o4, result: P0 }).strict(),
  CX = (X) => z5.safeParse(X).success,
  x;
(function (X) {
  (X[(X.ConnectionClosed = -32000)] = "ConnectionClosed"),
    (X[(X.RequestTimeout = -32001)] = "RequestTimeout"),
    (X[(X.ParseError = -32700)] = "ParseError"),
    (X[(X.InvalidRequest = -32600)] = "InvalidRequest"),
    (X[(X.MethodNotFound = -32601)] = "MethodNotFound"),
    (X[(X.InvalidParams = -32602)] = "InvalidParams"),
    (X[(X.InternalError = -32603)] = "InternalError"),
    (X[(X.UrlElicitationRequired = -32042)] = "UrlElicitationRequired");
})(x || (x = {}));
var K5 = E({
    jsonrpc: T(r4),
    id: o4,
    error: E({ code: Q0().int(), message: D(), data: v(N0()) }),
  }).strict(),
  U5 = (X) => K5.safeParse(X).success,
  MZ = J0([G5, H5, z5, K5]),
  t4 = P0.strict(),
  fq = J6.extend({ requestId: o4, reason: D().optional() }),
  a4 = p0.extend({ method: T("notifications/cancelled"), params: fq }),
  hq = E({ src: D(), mimeType: D().optional(), sizes: r(D()).optional() }),
  kX = E({ icons: r(hq).optional() }),
  T6 = E({ name: D(), title: D().optional() }),
  V5 = T6.extend({
    ...T6.shape,
    ...kX.shape,
    version: D(),
    websiteUrl: D().optional(),
  }),
  uq = i4(E({ applyDefaults: M0().optional() }), O0(D(), N0())),
  lq = b$((X) => {
    if (X && typeof X === "object" && !Array.isArray(X)) {
      if (Object.keys(X).length === 0) return { form: {} };
    }
    return X;
  }, i4(E({ form: uq.optional(), url: B1.optional() }), O0(D(), N0()).optional())),
  mq = E({
    list: v(E({}).passthrough()),
    cancel: v(E({}).passthrough()),
    requests: v(
      E({
        sampling: v(E({ createMessage: v(E({}).passthrough()) }).passthrough()),
        elicitation: v(E({ create: v(E({}).passthrough()) }).passthrough()),
      }).passthrough()
    ),
  }).passthrough(),
  cq = E({
    list: v(E({}).passthrough()),
    cancel: v(E({}).passthrough()),
    requests: v(
      E({
        tools: v(E({ call: v(E({}).passthrough()) }).passthrough()),
      }).passthrough()
    ),
  }).passthrough(),
  pq = E({
    experimental: O0(D(), B1).optional(),
    sampling: E({ context: B1.optional(), tools: B1.optional() }).optional(),
    elicitation: lq.optional(),
    roots: E({ listChanged: M0().optional() }).optional(),
    tasks: v(mq),
  }),
  dq = _0.extend({ protocolVersion: D(), capabilities: pq, clientInfo: V5 }),
  C$ = R0.extend({ method: T("initialize"), params: dq });
var iq = E({
    experimental: O0(D(), B1).optional(),
    logging: B1.optional(),
    completions: B1.optional(),
    prompts: v(E({ listChanged: v(M0()) })),
    resources: E({
      subscribe: M0().optional(),
      listChanged: M0().optional(),
    }).optional(),
    tools: E({ listChanged: M0().optional() }).optional(),
    tasks: v(cq),
  }).passthrough(),
  nq = P0.extend({
    protocolVersion: D(),
    capabilities: iq,
    serverInfo: V5,
    instructions: D().optional(),
  }),
  k$ = p0.extend({ method: T("notifications/initialized") });
var s4 = R0.extend({ method: T("ping") }),
  rq = E({ progress: Q0(), total: v(Q0()), message: v(D()) }),
  oq = E({ ...J6.shape, ...rq.shape, progressToken: W5 }),
  e4 = p0.extend({ method: T("notifications/progress"), params: oq }),
  tq = _0.extend({ cursor: J5.optional() }),
  vX = R0.extend({ params: tq.optional() }),
  TX = P0.extend({ nextCursor: v(J5) }),
  _X = E({
    taskId: D(),
    status: j0([
      "working",
      "input_required",
      "completed",
      "failed",
      "cancelled",
    ]),
    ttl: J0([Q0(), I$()]),
    createdAt: D(),
    lastUpdatedAt: D(),
    pollInterval: v(Q0()),
    statusMessage: v(D()),
  }),
  _6 = P0.extend({ task: _X }),
  aq = J6.merge(_X),
  xX = p0.extend({ method: T("notifications/tasks/status"), params: aq }),
  X8 = R0.extend({
    method: T("tasks/get"),
    params: _0.extend({ taskId: D() }),
  }),
  Q8 = P0.merge(_X),
  $8 = R0.extend({
    method: T("tasks/result"),
    params: _0.extend({ taskId: D() }),
  }),
  Y8 = vX.extend({ method: T("tasks/list") }),
  W8 = TX.extend({ tasks: r(_X) }),
  L5 = R0.extend({
    method: T("tasks/cancel"),
    params: _0.extend({ taskId: D() }),
  }),
  q5 = P0.merge(_X),
  F5 = E({ uri: D(), mimeType: v(D()), _meta: O0(D(), N0()).optional() }),
  N5 = F5.extend({ text: D() }),
  v$ = D().refine(
    (X) => {
      try {
        return atob(X), !0;
      } catch (Q) {
        return !1;
      }
    },
    { message: "Invalid Base64 string" }
  ),
  O5 = F5.extend({ blob: v$ }),
  x6 = E({
    audience: r(j0(["user", "assistant"])).optional(),
    priority: Q0().min(0).max(1).optional(),
    lastModified: SX.datetime({ offset: !0 }).optional(),
  }),
  D5 = E({
    ...T6.shape,
    ...kX.shape,
    uri: D(),
    description: v(D()),
    mimeType: v(D()),
    annotations: x6.optional(),
    _meta: v(c0({})),
  }),
  sq = E({
    ...T6.shape,
    ...kX.shape,
    uriTemplate: D(),
    description: v(D()),
    mimeType: v(D()),
    annotations: x6.optional(),
    _meta: v(c0({})),
  }),
  J8 = vX.extend({ method: T("resources/list") }),
  eq = TX.extend({ resources: r(D5) }),
  G8 = vX.extend({ method: T("resources/templates/list") }),
  XF = TX.extend({ resourceTemplates: r(sq) }),
  T$ = _0.extend({ uri: D() }),
  QF = T$,
  H8 = R0.extend({ method: T("resources/read"), params: QF }),
  $F = P0.extend({ contents: r(J0([N5, O5])) }),
  YF = p0.extend({ method: T("notifications/resources/list_changed") }),
  WF = T$,
  JF = R0.extend({ method: T("resources/subscribe"), params: WF }),
  GF = T$,
  HF = R0.extend({ method: T("resources/unsubscribe"), params: GF }),
  BF = J6.extend({ uri: D() }),
  zF = p0.extend({ method: T("notifications/resources/updated"), params: BF }),
  KF = E({ name: D(), description: v(D()), required: v(M0()) }),
  UF = E({
    ...T6.shape,
    ...kX.shape,
    description: v(D()),
    arguments: v(r(KF)),
    _meta: v(c0({})),
  }),
  B8 = vX.extend({ method: T("prompts/list") }),
  VF = TX.extend({ prompts: r(UF) }),
  LF = _0.extend({ name: D(), arguments: O0(D(), D()).optional() }),
  z8 = R0.extend({ method: T("prompts/get"), params: LF }),
  _$ = E({
    type: T("text"),
    text: D(),
    annotations: x6.optional(),
    _meta: O0(D(), N0()).optional(),
  }),
  x$ = E({
    type: T("image"),
    data: v$,
    mimeType: D(),
    annotations: x6.optional(),
    _meta: O0(D(), N0()).optional(),
  }),
  y$ = E({
    type: T("audio"),
    data: v$,
    mimeType: D(),
    annotations: x6.optional(),
    _meta: O0(D(), N0()).optional(),
  }),
  qF = E({
    type: T("tool_use"),
    name: D(),
    id: D(),
    input: E({}).passthrough(),
    _meta: v(E({}).passthrough()),
  }).passthrough(),
  FF = E({
    type: T("resource"),
    resource: J0([N5, O5]),
    annotations: x6.optional(),
    _meta: O0(D(), N0()).optional(),
  }),
  NF = D5.extend({ type: T("resource_link") }),
  g$ = J0([_$, x$, y$, NF, FF]),
  OF = E({ role: j0(["user", "assistant"]), content: g$ }),
  DF = P0.extend({ description: v(D()), messages: r(OF) }),
  wF = p0.extend({ method: T("notifications/prompts/list_changed") }),
  AF = E({
    title: D().optional(),
    readOnlyHint: M0().optional(),
    destructiveHint: M0().optional(),
    idempotentHint: M0().optional(),
    openWorldHint: M0().optional(),
  }),
  MF = E({ taskSupport: j0(["required", "optional", "forbidden"]).optional() }),
  w5 = E({
    ...T6.shape,
    ...kX.shape,
    description: D().optional(),
    inputSchema: E({
      type: T("object"),
      properties: O0(D(), B1).optional(),
      required: r(D()).optional(),
    }).catchall(N0()),
    outputSchema: E({
      type: T("object"),
      properties: O0(D(), B1).optional(),
      required: r(D()).optional(),
    })
      .catchall(N0())
      .optional(),
    annotations: v(AF),
    execution: v(MF),
    _meta: O0(D(), N0()).optional(),
  }),
  K8 = vX.extend({ method: T("tools/list") }),
  jF = TX.extend({ tools: r(w5) }),
  U8 = P0.extend({
    content: r(g$).default([]),
    structuredContent: O0(D(), N0()).optional(),
    isError: v(M0()),
  }),
  jZ = U8.or(P0.extend({ toolResult: N0() })),
  RF = _0.extend({ name: D(), arguments: v(O0(D(), N0())) }),
  y6 = R0.extend({ method: T("tools/call"), params: RF }),
  IF = p0.extend({ method: T("notifications/tools/list_changed") }),
  yX = j0([
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency",
  ]),
  EF = _0.extend({ level: yX }),
  f$ = R0.extend({ method: T("logging/setLevel"), params: EF }),
  bF = J6.extend({ level: yX, logger: D().optional(), data: N0() }),
  PF = p0.extend({ method: T("notifications/message"), params: bF }),
  SF = E({ name: D().optional() }),
  ZF = E({
    hints: v(r(SF)),
    costPriority: v(Q0().min(0).max(1)),
    speedPriority: v(Q0().min(0).max(1)),
    intelligencePriority: v(Q0().min(0).max(1)),
  }),
  CF = E({ mode: v(j0(["auto", "required", "none"])) }),
  kF = E({
    type: T("tool_result"),
    toolUseId: D().describe(
      "The unique identifier for the corresponding tool call."
    ),
    content: r(g$).default([]),
    structuredContent: E({}).passthrough().optional(),
    isError: v(M0()),
    _meta: v(E({}).passthrough()),
  }).passthrough(),
  vF = E$("type", [_$, x$, y$]),
  n4 = E$("type", [_$, x$, y$, qF, kF]),
  TF = E({
    role: j0(["user", "assistant"]),
    content: J0([n4, r(n4)]),
    _meta: v(E({}).passthrough()),
  }).passthrough(),
  _F = _0.extend({
    messages: r(TF),
    modelPreferences: ZF.optional(),
    systemPrompt: D().optional(),
    includeContext: j0(["none", "thisServer", "allServers"]).optional(),
    temperature: Q0().optional(),
    maxTokens: Q0().int(),
    stopSequences: r(D()).optional(),
    metadata: B1.optional(),
    tools: v(r(w5)),
    toolChoice: v(CF),
  }),
  xF = R0.extend({ method: T("sampling/createMessage"), params: _F }),
  h$ = P0.extend({
    model: D(),
    stopReason: v(j0(["endTurn", "stopSequence", "maxTokens"]).or(D())),
    role: j0(["user", "assistant"]),
    content: vF,
  }),
  u$ = P0.extend({
    model: D(),
    stopReason: v(
      j0(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(D())
    ),
    role: j0(["user", "assistant"]),
    content: J0([n4, r(n4)]),
  }),
  yF = E({
    type: T("boolean"),
    title: D().optional(),
    description: D().optional(),
    default: M0().optional(),
  }),
  gF = E({
    type: T("string"),
    title: D().optional(),
    description: D().optional(),
    minLength: Q0().optional(),
    maxLength: Q0().optional(),
    format: j0(["email", "uri", "date", "date-time"]).optional(),
    default: D().optional(),
  }),
  fF = E({
    type: j0(["number", "integer"]),
    title: D().optional(),
    description: D().optional(),
    minimum: Q0().optional(),
    maximum: Q0().optional(),
    default: Q0().optional(),
  }),
  hF = E({
    type: T("string"),
    title: D().optional(),
    description: D().optional(),
    enum: r(D()),
    default: D().optional(),
  }),
  uF = E({
    type: T("string"),
    title: D().optional(),
    description: D().optional(),
    oneOf: r(E({ const: D(), title: D() })),
    default: D().optional(),
  }),
  lF = E({
    type: T("string"),
    title: D().optional(),
    description: D().optional(),
    enum: r(D()),
    enumNames: r(D()).optional(),
    default: D().optional(),
  }),
  mF = J0([hF, uF]),
  cF = E({
    type: T("array"),
    title: D().optional(),
    description: D().optional(),
    minItems: Q0().optional(),
    maxItems: Q0().optional(),
    items: E({ type: T("string"), enum: r(D()) }),
    default: r(D()).optional(),
  }),
  pF = E({
    type: T("array"),
    title: D().optional(),
    description: D().optional(),
    minItems: Q0().optional(),
    maxItems: Q0().optional(),
    items: E({ anyOf: r(E({ const: D(), title: D() })) }),
    default: r(D()).optional(),
  }),
  dF = J0([cF, pF]),
  iF = J0([lF, mF, dF]),
  nF = J0([iF, yF, gF, fF]),
  rF = _0.extend({
    mode: T("form").optional(),
    message: D(),
    requestedSchema: E({
      type: T("object"),
      properties: O0(D(), nF),
      required: r(D()).optional(),
    }),
  }),
  oF = _0.extend({
    mode: T("url"),
    message: D(),
    elicitationId: D(),
    url: D().url(),
  }),
  tF = J0([rF, oF]),
  aF = R0.extend({ method: T("elicitation/create"), params: tF }),
  sF = J6.extend({ elicitationId: D() }),
  eF = p0.extend({
    method: T("notifications/elicitation/complete"),
    params: sF,
  }),
  V8 = P0.extend({
    action: j0(["accept", "decline", "cancel"]),
    content: b$(
      (X) => (X === null ? void 0 : X),
      O0(D(), J0([D(), Q0(), M0(), r(D())])).optional()
    ),
  }),
  XN = E({ type: T("ref/resource"), uri: D() });
var QN = E({ type: T("ref/prompt"), name: D() }),
  $N = _0.extend({
    ref: J0([QN, XN]),
    argument: E({ name: D(), value: D() }),
    context: E({ arguments: O0(D(), D()).optional() }).optional(),
  }),
  L8 = R0.extend({ method: T("completion/complete"), params: $N });
function A5(X) {
  if (X.params.ref.type !== "ref/prompt")
    throw TypeError(
      `Expected CompleteRequestPrompt, but got ${X.params.ref.type}`
    );
}
function M5(X) {
  if (X.params.ref.type !== "ref/resource")
    throw TypeError(
      `Expected CompleteRequestResourceTemplate, but got ${X.params.ref.type}`
    );
}
var YN = P0.extend({
    completion: c0({
      values: r(D()).max(100),
      total: v(Q0().int()),
      hasMore: v(M0()),
    }),
  }),
  WN = E({
    uri: D().startsWith("file://"),
    name: D().optional(),
    _meta: O0(D(), N0()).optional(),
  }),
  JN = R0.extend({ method: T("roots/list") }),
  l$ = P0.extend({ roots: r(WN) }),
  GN = p0.extend({ method: T("notifications/roots/list_changed") }),
  RZ = J0([s4, C$, L8, f$, z8, B8, J8, G8, H8, JF, HF, y6, K8, X8, $8, Y8]),
  IZ = J0([a4, e4, k$, GN, xX]),
  EZ = J0([t4, h$, u$, V8, l$, Q8, W8, _6]),
  bZ = J0([s4, xF, aF, JN, X8, $8, Y8]),
  PZ = J0([a4, e4, PF, zF, YF, IF, wF, xX, eF]),
  SZ = J0([t4, nq, YN, DF, VF, eq, XF, $F, U8, jF, Q8, W8, _6]);
class k extends Error {
  constructor(X, Q, $) {
    super(`MCP error ${X}: ${Q}`);
    (this.code = X), (this.data = $), (this.name = "McpError");
  }
  static fromError(X, Q, $) {
    if (X === x.UrlElicitationRequired && $) {
      let Y = $;
      if (Y.elicitations) return new j5(Y.elicitations, Q);
    }
    return new k(X, Q, $);
  }
}
class j5 extends k {
  constructor(X, Q = `URL elicitation${X.length > 1 ? "s" : ""} required`) {
    super(x.UrlElicitationRequired, Q, { elicitations: X });
  }
  get elicitations() {
    var X, Q;
    return (Q =
      (X = this.data) === null || X === void 0 ? void 0 : X.elicitations) !==
      null && Q !== void 0
      ? Q
      : [];
  }
}
function u1(X) {
  return X === "completed" || X === "failed" || X === "cancelled";
}
var I5 = Symbol("Let zodToJsonSchema decide on which parser to use");
var R5 = {
    name: void 0,
    $refStrategy: "root",
    basePath: ["#"],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    allowedAdditionalProperties: !0,
    rejectedAdditionalProperties: !1,
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: !1,
    definitions: {},
    errorMessages: !1,
    markdownDescription: !1,
    patternStrategy: "escape",
    applyRegexFlags: !1,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref",
    openAiAnyTypeName: "OpenAiAnyType",
  },
  E5 = (X) => (typeof X === "string" ? { ...R5, name: X } : { ...R5, ...X });
var b5 = (X) => {
  let Q = E5(X),
    $ =
      Q.name !== void 0
        ? [...Q.basePath, Q.definitionPath, Q.name]
        : Q.basePath;
  return {
    ...Q,
    flags: { hasReferencedOpenAiAnyType: !1 },
    currentPath: $,
    propertyPath: void 0,
    seen: new Map(
      Object.entries(Q.definitions).map(([Y, W]) => [
        W._def,
        {
          def: W._def,
          path: [...Q.basePath, Q.definitionPath, Y],
          jsonSchema: void 0,
        },
      ])
    ),
  };
};
function m$(X, Q, $, Y) {
  if (!Y?.errorMessages) return;
  if ($) X.errorMessage = { ...X.errorMessage, [Q]: $ };
}
function o(X, Q, $, Y, W) {
  (X[Q] = $), m$(X, Q, Y, W);
}
var q8 = (X, Q) => {
  let $ = 0;
  for (; $ < X.length && $ < Q.length; $++) if (X[$] !== Q[$]) break;
  return [(X.length - $).toString(), ...Q.slice($)].join("/");
};
function B0(X) {
  if (X.target !== "openAi") return {};
  let Q = [...X.basePath, X.definitionPath, X.openAiAnyTypeName];
  return (
    (X.flags.hasReferencedOpenAiAnyType = !0),
    { $ref: X.$refStrategy === "relative" ? q8(Q, X.currentPath) : Q.join("/") }
  );
}
function P5(X, Q) {
  let $ = { type: "array" };
  if (X.type?._def && X.type?._def?.typeName !== j.ZodAny)
    $.items = f(X.type._def, {
      ...Q,
      currentPath: [...Q.currentPath, "items"],
    });
  if (X.minLength) o($, "minItems", X.minLength.value, X.minLength.message, Q);
  if (X.maxLength) o($, "maxItems", X.maxLength.value, X.maxLength.message, Q);
  if (X.exactLength)
    o($, "minItems", X.exactLength.value, X.exactLength.message, Q),
      o($, "maxItems", X.exactLength.value, X.exactLength.message, Q);
  return $;
}
function S5(X, Q) {
  let $ = { type: "integer", format: "int64" };
  if (!X.checks) return $;
  for (let Y of X.checks)
    switch (Y.kind) {
      case "min":
        if (Q.target === "jsonSchema7")
          if (Y.inclusive) o($, "minimum", Y.value, Y.message, Q);
          else o($, "exclusiveMinimum", Y.value, Y.message, Q);
        else {
          if (!Y.inclusive) $.exclusiveMinimum = !0;
          o($, "minimum", Y.value, Y.message, Q);
        }
        break;
      case "max":
        if (Q.target === "jsonSchema7")
          if (Y.inclusive) o($, "maximum", Y.value, Y.message, Q);
          else o($, "exclusiveMaximum", Y.value, Y.message, Q);
        else {
          if (!Y.inclusive) $.exclusiveMaximum = !0;
          o($, "maximum", Y.value, Y.message, Q);
        }
        break;
      case "multipleOf":
        o($, "multipleOf", Y.value, Y.message, Q);
        break;
    }
  return $;
}
function Z5() {
  return { type: "boolean" };
}
function F8(X, Q) {
  return f(X.type._def, Q);
}
var C5 = (X, Q) => {
  return f(X.innerType._def, Q);
};
function c$(X, Q, $) {
  let Y = $ ?? Q.dateStrategy;
  if (Array.isArray(Y)) return { anyOf: Y.map((W, J) => c$(X, Q, W)) };
  switch (Y) {
    case "string":
    case "format:date-time":
      return { type: "string", format: "date-time" };
    case "format:date":
      return { type: "string", format: "date" };
    case "integer":
      return HN(X, Q);
  }
}
var HN = (X, Q) => {
  let $ = { type: "integer", format: "unix-time" };
  if (Q.target === "openApi3") return $;
  for (let Y of X.checks)
    switch (Y.kind) {
      case "min":
        o($, "minimum", Y.value, Y.message, Q);
        break;
      case "max":
        o($, "maximum", Y.value, Y.message, Q);
        break;
    }
  return $;
};
function k5(X, Q) {
  return { ...f(X.innerType._def, Q), default: X.defaultValue() };
}
function v5(X, Q) {
  return Q.effectStrategy === "input" ? f(X.schema._def, Q) : B0(Q);
}
function T5(X) {
  return { type: "string", enum: Array.from(X.values) };
}
var BN = (X) => {
  if ("type" in X && X.type === "string") return !1;
  return "allOf" in X;
};
function _5(X, Q) {
  let $ = [
      f(X.left._def, { ...Q, currentPath: [...Q.currentPath, "allOf", "0"] }),
      f(X.right._def, { ...Q, currentPath: [...Q.currentPath, "allOf", "1"] }),
    ].filter((J) => !!J),
    Y =
      Q.target === "jsonSchema2019-09" ? { unevaluatedProperties: !1 } : void 0,
    W = [];
  return (
    $.forEach((J) => {
      if (BN(J)) {
        if ((W.push(...J.allOf), J.unevaluatedProperties === void 0))
          Y = void 0;
      } else {
        let G = J;
        if ("additionalProperties" in J && J.additionalProperties === !1) {
          let { additionalProperties: H, ...B } = J;
          G = B;
        } else Y = void 0;
        W.push(G);
      }
    }),
    W.length ? { allOf: W, ...Y } : void 0
  );
}
function x5(X, Q) {
  let $ = typeof X.value;
  if ($ !== "bigint" && $ !== "number" && $ !== "boolean" && $ !== "string")
    return { type: Array.isArray(X.value) ? "array" : "object" };
  if (Q.target === "openApi3")
    return { type: $ === "bigint" ? "integer" : $, enum: [X.value] };
  return { type: $ === "bigint" ? "integer" : $, const: X.value };
}
var p$ = void 0,
  t0 = {
    cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    email:
      /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    emoji: () => {
      if (p$ === void 0)
        p$ = RegExp(
          "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
          "u"
        );
      return p$;
    },
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr:
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr:
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url:
      /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  };
function N8(X, Q) {
  let $ = { type: "string" };
  if (X.checks)
    for (let Y of X.checks)
      switch (Y.kind) {
        case "min":
          o(
            $,
            "minLength",
            typeof $.minLength === "number"
              ? Math.max($.minLength, Y.value)
              : Y.value,
            Y.message,
            Q
          );
          break;
        case "max":
          o(
            $,
            "maxLength",
            typeof $.maxLength === "number"
              ? Math.min($.maxLength, Y.value)
              : Y.value,
            Y.message,
            Q
          );
          break;
        case "email":
          switch (Q.emailStrategy) {
            case "format:email":
              a0($, "email", Y.message, Q);
              break;
            case "format:idn-email":
              a0($, "idn-email", Y.message, Q);
              break;
            case "pattern:zod":
              k0($, t0.email, Y.message, Q);
              break;
          }
          break;
        case "url":
          a0($, "uri", Y.message, Q);
          break;
        case "uuid":
          a0($, "uuid", Y.message, Q);
          break;
        case "regex":
          k0($, Y.regex, Y.message, Q);
          break;
        case "cuid":
          k0($, t0.cuid, Y.message, Q);
          break;
        case "cuid2":
          k0($, t0.cuid2, Y.message, Q);
          break;
        case "startsWith":
          k0($, RegExp(`^${d$(Y.value, Q)}`), Y.message, Q);
          break;
        case "endsWith":
          k0($, RegExp(`${d$(Y.value, Q)}$`), Y.message, Q);
          break;
        case "datetime":
          a0($, "date-time", Y.message, Q);
          break;
        case "date":
          a0($, "date", Y.message, Q);
          break;
        case "time":
          a0($, "time", Y.message, Q);
          break;
        case "duration":
          a0($, "duration", Y.message, Q);
          break;
        case "length":
          o(
            $,
            "minLength",
            typeof $.minLength === "number"
              ? Math.max($.minLength, Y.value)
              : Y.value,
            Y.message,
            Q
          ),
            o(
              $,
              "maxLength",
              typeof $.maxLength === "number"
                ? Math.min($.maxLength, Y.value)
                : Y.value,
              Y.message,
              Q
            );
          break;
        case "includes": {
          k0($, RegExp(d$(Y.value, Q)), Y.message, Q);
          break;
        }
        case "ip": {
          if (Y.version !== "v6") a0($, "ipv4", Y.message, Q);
          if (Y.version !== "v4") a0($, "ipv6", Y.message, Q);
          break;
        }
        case "base64url":
          k0($, t0.base64url, Y.message, Q);
          break;
        case "jwt":
          k0($, t0.jwt, Y.message, Q);
          break;
        case "cidr": {
          if (Y.version !== "v6") k0($, t0.ipv4Cidr, Y.message, Q);
          if (Y.version !== "v4") k0($, t0.ipv6Cidr, Y.message, Q);
          break;
        }
        case "emoji":
          k0($, t0.emoji(), Y.message, Q);
          break;
        case "ulid": {
          k0($, t0.ulid, Y.message, Q);
          break;
        }
        case "base64": {
          switch (Q.base64Strategy) {
            case "format:binary": {
              a0($, "binary", Y.message, Q);
              break;
            }
            case "contentEncoding:base64": {
              o($, "contentEncoding", "base64", Y.message, Q);
              break;
            }
            case "pattern:zod": {
              k0($, t0.base64, Y.message, Q);
              break;
            }
          }
          break;
        }
        case "nanoid":
          k0($, t0.nanoid, Y.message, Q);
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          ((W) => {})(Y);
      }
  return $;
}
function d$(X, Q) {
  return Q.patternStrategy === "escape" ? KN(X) : X;
}
var zN = new Set(
  "ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789"
);
function KN(X) {
  let Q = "";
  for (let $ = 0; $ < X.length; $++) {
    if (!zN.has(X[$])) Q += "\\";
    Q += X[$];
  }
  return Q;
}
function a0(X, Q, $, Y) {
  if (X.format || X.anyOf?.some((W) => W.format)) {
    if (!X.anyOf) X.anyOf = [];
    if (X.format) {
      if (
        (X.anyOf.push({
          format: X.format,
          ...(X.errorMessage &&
            Y.errorMessages && {
              errorMessage: { format: X.errorMessage.format },
            }),
        }),
        delete X.format,
        X.errorMessage)
      ) {
        if (
          (delete X.errorMessage.format,
          Object.keys(X.errorMessage).length === 0)
        )
          delete X.errorMessage;
      }
    }
    X.anyOf.push({
      format: Q,
      ...($ && Y.errorMessages && { errorMessage: { format: $ } }),
    });
  } else o(X, "format", Q, $, Y);
}
function k0(X, Q, $, Y) {
  if (X.pattern || X.allOf?.some((W) => W.pattern)) {
    if (!X.allOf) X.allOf = [];
    if (X.pattern) {
      if (
        (X.allOf.push({
          pattern: X.pattern,
          ...(X.errorMessage &&
            Y.errorMessages && {
              errorMessage: { pattern: X.errorMessage.pattern },
            }),
        }),
        delete X.pattern,
        X.errorMessage)
      ) {
        if (
          (delete X.errorMessage.pattern,
          Object.keys(X.errorMessage).length === 0)
        )
          delete X.errorMessage;
      }
    }
    X.allOf.push({
      pattern: y5(Q, Y),
      ...($ && Y.errorMessages && { errorMessage: { pattern: $ } }),
    });
  } else o(X, "pattern", y5(Q, Y), $, Y);
}
function y5(X, Q) {
  if (!Q.applyRegexFlags || !X.flags) return X.source;
  let $ = {
      i: X.flags.includes("i"),
      m: X.flags.includes("m"),
      s: X.flags.includes("s"),
    },
    Y = $.i ? X.source.toLowerCase() : X.source,
    W = "",
    J = !1,
    G = !1,
    H = !1;
  for (let B = 0; B < Y.length; B++) {
    if (J) {
      (W += Y[B]), (J = !1);
      continue;
    }
    if ($.i) {
      if (G) {
        if (Y[B].match(/[a-z]/)) {
          if (H)
            (W += Y[B]), (W += `${Y[B - 2]}-${Y[B]}`.toUpperCase()), (H = !1);
          else if (Y[B + 1] === "-" && Y[B + 2]?.match(/[a-z]/))
            (W += Y[B]), (H = !0);
          else W += `${Y[B]}${Y[B].toUpperCase()}`;
          continue;
        }
      } else if (Y[B].match(/[a-z]/)) {
        W += `[${Y[B]}${Y[B].toUpperCase()}]`;
        continue;
      }
    }
    if ($.m) {
      if (Y[B] === "^") {
        W += `(^|(?<=[\r
]))`;
        continue;
      } else if (Y[B] === "$") {
        W += `($|(?=[\r
]))`;
        continue;
      }
    }
    if ($.s && Y[B] === ".") {
      W += G
        ? `${Y[B]}\r
`
        : `[${Y[B]}\r
]`;
      continue;
    }
    if (((W += Y[B]), Y[B] === "\\")) J = !0;
    else if (G && Y[B] === "]") G = !1;
    else if (!G && Y[B] === "[") G = !0;
  }
  try {
    new RegExp(W);
  } catch {
    return (
      console.warn(
        `Could not convert regex pattern at ${Q.currentPath.join(
          "/"
        )} to a flag-independent form! Falling back to the flag-ignorant source`
      ),
      X.source
    );
  }
  return W;
}
function O8(X, Q) {
  if (Q.target === "openAi")
    console.warn(
      "Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead."
    );
  if (Q.target === "openApi3" && X.keyType?._def.typeName === j.ZodEnum)
    return {
      type: "object",
      required: X.keyType._def.values,
      properties: X.keyType._def.values.reduce(
        (Y, W) => ({
          ...Y,
          [W]:
            f(X.valueType._def, {
              ...Q,
              currentPath: [...Q.currentPath, "properties", W],
            }) ?? B0(Q),
        }),
        {}
      ),
      additionalProperties: Q.rejectedAdditionalProperties,
    };
  let $ = {
    type: "object",
    additionalProperties:
      f(X.valueType._def, {
        ...Q,
        currentPath: [...Q.currentPath, "additionalProperties"],
      }) ?? Q.allowedAdditionalProperties,
  };
  if (Q.target === "openApi3") return $;
  if (
    X.keyType?._def.typeName === j.ZodString &&
    X.keyType._def.checks?.length
  ) {
    let { type: Y, ...W } = N8(X.keyType._def, Q);
    return { ...$, propertyNames: W };
  } else if (X.keyType?._def.typeName === j.ZodEnum)
    return { ...$, propertyNames: { enum: X.keyType._def.values } };
  else if (
    X.keyType?._def.typeName === j.ZodBranded &&
    X.keyType._def.type._def.typeName === j.ZodString &&
    X.keyType._def.type._def.checks?.length
  ) {
    let { type: Y, ...W } = F8(X.keyType._def, Q);
    return { ...$, propertyNames: W };
  }
  return $;
}
function g5(X, Q) {
  if (Q.mapStrategy === "record") return O8(X, Q);
  let $ =
      f(X.keyType._def, {
        ...Q,
        currentPath: [...Q.currentPath, "items", "items", "0"],
      }) || B0(Q),
    Y =
      f(X.valueType._def, {
        ...Q,
        currentPath: [...Q.currentPath, "items", "items", "1"],
      }) || B0(Q);
  return {
    type: "array",
    maxItems: 125,
    items: { type: "array", items: [$, Y], minItems: 2, maxItems: 2 },
  };
}
function f5(X) {
  let Q = X.values,
    Y = Object.keys(X.values)
      .filter((J) => {
        return typeof Q[Q[J]] !== "number";
      })
      .map((J) => Q[J]),
    W = Array.from(new Set(Y.map((J) => typeof J)));
  return {
    type:
      W.length === 1
        ? W[0] === "string"
          ? "string"
          : "number"
        : ["string", "number"],
    enum: Y,
  };
}
function h5(X) {
  return X.target === "openAi"
    ? void 0
    : { not: B0({ ...X, currentPath: [...X.currentPath, "not"] }) };
}
function u5(X) {
  return X.target === "openApi3"
    ? { enum: ["null"], nullable: !0 }
    : { type: "null" };
}
var gX = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null",
};
function m5(X, Q) {
  if (Q.target === "openApi3") return l5(X, Q);
  let $ = X.options instanceof Map ? Array.from(X.options.values()) : X.options;
  if (
    $.every(
      (Y) => Y._def.typeName in gX && (!Y._def.checks || !Y._def.checks.length)
    )
  ) {
    let Y = $.reduce((W, J) => {
      let G = gX[J._def.typeName];
      return G && !W.includes(G) ? [...W, G] : W;
    }, []);
    return { type: Y.length > 1 ? Y : Y[0] };
  } else if (
    $.every((Y) => Y._def.typeName === "ZodLiteral" && !Y.description)
  ) {
    let Y = $.reduce((W, J) => {
      let G = typeof J._def.value;
      switch (G) {
        case "string":
        case "number":
        case "boolean":
          return [...W, G];
        case "bigint":
          return [...W, "integer"];
        case "object":
          if (J._def.value === null) return [...W, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return W;
      }
    }, []);
    if (Y.length === $.length) {
      let W = Y.filter((J, G, H) => H.indexOf(J) === G);
      return {
        type: W.length > 1 ? W : W[0],
        enum: $.reduce((J, G) => {
          return J.includes(G._def.value) ? J : [...J, G._def.value];
        }, []),
      };
    }
  } else if ($.every((Y) => Y._def.typeName === "ZodEnum"))
    return {
      type: "string",
      enum: $.reduce(
        (Y, W) => [...Y, ...W._def.values.filter((J) => !Y.includes(J))],
        []
      ),
    };
  return l5(X, Q);
}
var l5 = (X, Q) => {
  let $ = (
    X.options instanceof Map ? Array.from(X.options.values()) : X.options
  )
    .map((Y, W) =>
      f(Y._def, { ...Q, currentPath: [...Q.currentPath, "anyOf", `${W}`] })
    )
    .filter(
      (Y) =>
        !!Y &&
        (!Q.strictUnions ||
          (typeof Y === "object" && Object.keys(Y).length > 0))
    );
  return $.length ? { anyOf: $ } : void 0;
};
function c5(X, Q) {
  if (
    ["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(
      X.innerType._def.typeName
    ) &&
    (!X.innerType._def.checks || !X.innerType._def.checks.length)
  ) {
    if (Q.target === "openApi3")
      return { type: gX[X.innerType._def.typeName], nullable: !0 };
    return { type: [gX[X.innerType._def.typeName], "null"] };
  }
  if (Q.target === "openApi3") {
    let Y = f(X.innerType._def, { ...Q, currentPath: [...Q.currentPath] });
    if (Y && "$ref" in Y) return { allOf: [Y], nullable: !0 };
    return Y && { ...Y, nullable: !0 };
  }
  let $ = f(X.innerType._def, {
    ...Q,
    currentPath: [...Q.currentPath, "anyOf", "0"],
  });
  return $ && { anyOf: [$, { type: "null" }] };
}
function p5(X, Q) {
  let $ = { type: "number" };
  if (!X.checks) return $;
  for (let Y of X.checks)
    switch (Y.kind) {
      case "int":
        ($.type = "integer"), m$($, "type", Y.message, Q);
        break;
      case "min":
        if (Q.target === "jsonSchema7")
          if (Y.inclusive) o($, "minimum", Y.value, Y.message, Q);
          else o($, "exclusiveMinimum", Y.value, Y.message, Q);
        else {
          if (!Y.inclusive) $.exclusiveMinimum = !0;
          o($, "minimum", Y.value, Y.message, Q);
        }
        break;
      case "max":
        if (Q.target === "jsonSchema7")
          if (Y.inclusive) o($, "maximum", Y.value, Y.message, Q);
          else o($, "exclusiveMaximum", Y.value, Y.message, Q);
        else {
          if (!Y.inclusive) $.exclusiveMaximum = !0;
          o($, "maximum", Y.value, Y.message, Q);
        }
        break;
      case "multipleOf":
        o($, "multipleOf", Y.value, Y.message, Q);
        break;
    }
  return $;
}
function d5(X, Q) {
  let $ = Q.target === "openAi",
    Y = { type: "object", properties: {} },
    W = [],
    J = X.shape();
  for (let H in J) {
    let B = J[H];
    if (B === void 0 || B._def === void 0) continue;
    let z = VN(B);
    if (z && $) {
      if (B._def.typeName === "ZodOptional") B = B._def.innerType;
      if (!B.isNullable()) B = B.nullable();
      z = !1;
    }
    let K = f(B._def, {
      ...Q,
      currentPath: [...Q.currentPath, "properties", H],
      propertyPath: [...Q.currentPath, "properties", H],
    });
    if (K === void 0) continue;
    if (((Y.properties[H] = K), !z)) W.push(H);
  }
  if (W.length) Y.required = W;
  let G = UN(X, Q);
  if (G !== void 0) Y.additionalProperties = G;
  return Y;
}
function UN(X, Q) {
  if (X.catchall._def.typeName !== "ZodNever")
    return f(X.catchall._def, {
      ...Q,
      currentPath: [...Q.currentPath, "additionalProperties"],
    });
  switch (X.unknownKeys) {
    case "passthrough":
      return Q.allowedAdditionalProperties;
    case "strict":
      return Q.rejectedAdditionalProperties;
    case "strip":
      return Q.removeAdditionalStrategy === "strict"
        ? Q.allowedAdditionalProperties
        : Q.rejectedAdditionalProperties;
  }
}
function VN(X) {
  try {
    return X.isOptional();
  } catch {
    return !0;
  }
}
var i5 = (X, Q) => {
  if (Q.currentPath.toString() === Q.propertyPath?.toString())
    return f(X.innerType._def, Q);
  let $ = f(X.innerType._def, {
    ...Q,
    currentPath: [...Q.currentPath, "anyOf", "1"],
  });
  return $ ? { anyOf: [{ not: B0(Q) }, $] } : B0(Q);
};
var n5 = (X, Q) => {
  if (Q.pipeStrategy === "input") return f(X.in._def, Q);
  else if (Q.pipeStrategy === "output") return f(X.out._def, Q);
  let $ = f(X.in._def, { ...Q, currentPath: [...Q.currentPath, "allOf", "0"] }),
    Y = f(X.out._def, {
      ...Q,
      currentPath: [...Q.currentPath, "allOf", $ ? "1" : "0"],
    });
  return { allOf: [$, Y].filter((W) => W !== void 0) };
};
function r5(X, Q) {
  return f(X.type._def, Q);
}
function o5(X, Q) {
  let Y = {
    type: "array",
    uniqueItems: !0,
    items: f(X.valueType._def, {
      ...Q,
      currentPath: [...Q.currentPath, "items"],
    }),
  };
  if (X.minSize) o(Y, "minItems", X.minSize.value, X.minSize.message, Q);
  if (X.maxSize) o(Y, "maxItems", X.maxSize.value, X.maxSize.message, Q);
  return Y;
}
function t5(X, Q) {
  if (X.rest)
    return {
      type: "array",
      minItems: X.items.length,
      items: X.items
        .map(($, Y) =>
          f($._def, { ...Q, currentPath: [...Q.currentPath, "items", `${Y}`] })
        )
        .reduce(($, Y) => (Y === void 0 ? $ : [...$, Y]), []),
      additionalItems: f(X.rest._def, {
        ...Q,
        currentPath: [...Q.currentPath, "additionalItems"],
      }),
    };
  else
    return {
      type: "array",
      minItems: X.items.length,
      maxItems: X.items.length,
      items: X.items
        .map(($, Y) =>
          f($._def, { ...Q, currentPath: [...Q.currentPath, "items", `${Y}`] })
        )
        .reduce(($, Y) => (Y === void 0 ? $ : [...$, Y]), []),
    };
}
function a5(X) {
  return { not: B0(X) };
}
function s5(X) {
  return B0(X);
}
var e5 = (X, Q) => {
  return f(X.innerType._def, Q);
};
var XG = (X, Q, $) => {
  switch (Q) {
    case j.ZodString:
      return N8(X, $);
    case j.ZodNumber:
      return p5(X, $);
    case j.ZodObject:
      return d5(X, $);
    case j.ZodBigInt:
      return S5(X, $);
    case j.ZodBoolean:
      return Z5();
    case j.ZodDate:
      return c$(X, $);
    case j.ZodUndefined:
      return a5($);
    case j.ZodNull:
      return u5($);
    case j.ZodArray:
      return P5(X, $);
    case j.ZodUnion:
    case j.ZodDiscriminatedUnion:
      return m5(X, $);
    case j.ZodIntersection:
      return _5(X, $);
    case j.ZodTuple:
      return t5(X, $);
    case j.ZodRecord:
      return O8(X, $);
    case j.ZodLiteral:
      return x5(X, $);
    case j.ZodEnum:
      return T5(X);
    case j.ZodNativeEnum:
      return f5(X);
    case j.ZodNullable:
      return c5(X, $);
    case j.ZodOptional:
      return i5(X, $);
    case j.ZodMap:
      return g5(X, $);
    case j.ZodSet:
      return o5(X, $);
    case j.ZodLazy:
      return () => X.getter()._def;
    case j.ZodPromise:
      return r5(X, $);
    case j.ZodNaN:
    case j.ZodNever:
      return h5($);
    case j.ZodEffects:
      return v5(X, $);
    case j.ZodAny:
      return B0($);
    case j.ZodUnknown:
      return s5($);
    case j.ZodDefault:
      return k5(X, $);
    case j.ZodBranded:
      return F8(X, $);
    case j.ZodReadonly:
      return e5(X, $);
    case j.ZodCatch:
      return C5(X, $);
    case j.ZodPipeline:
      return n5(X, $);
    case j.ZodFunction:
    case j.ZodVoid:
    case j.ZodSymbol:
      return;
    default:
      return ((Y) => {
        return;
      })(Q);
  }
};
function f(X, Q, $ = !1) {
  let Y = Q.seen.get(X);
  if (Q.override) {
    let H = Q.override?.(X, Q, Y, $);
    if (H !== I5) return H;
  }
  if (Y && !$) {
    let H = LN(Y, Q);
    if (H !== void 0) return H;
  }
  let W = { def: X, path: Q.currentPath, jsonSchema: void 0 };
  Q.seen.set(X, W);
  let J = XG(X, X.typeName, Q),
    G = typeof J === "function" ? f(J(), Q) : J;
  if (G) qN(X, Q, G);
  if (Q.postProcess) {
    let H = Q.postProcess(G, X, Q);
    return (W.jsonSchema = G), H;
  }
  return (W.jsonSchema = G), G;
}
var LN = (X, Q) => {
    switch (Q.$refStrategy) {
      case "root":
        return { $ref: X.path.join("/") };
      case "relative":
        return { $ref: q8(Q.currentPath, X.path) };
      case "none":
      case "seen": {
        if (
          X.path.length < Q.currentPath.length &&
          X.path.every(($, Y) => Q.currentPath[Y] === $)
        )
          return (
            console.warn(
              `Recursive reference detected at ${Q.currentPath.join(
                "/"
              )}! Defaulting to any`
            ),
            B0(Q)
          );
        return Q.$refStrategy === "seen" ? B0(Q) : void 0;
      }
    }
  },
  qN = (X, Q, $) => {
    if (X.description) {
      if ((($.description = X.description), Q.markdownDescription))
        $.markdownDescription = X.description;
    }
    return $;
  };
var i$ = (X, Q) => {
  let $ = b5(Q),
    Y =
      typeof Q === "object" && Q.definitions
        ? Object.entries(Q.definitions).reduce(
            (B, [z, K]) => ({
              ...B,
              [z]:
                f(
                  K._def,
                  { ...$, currentPath: [...$.basePath, $.definitionPath, z] },
                  !0
                ) ?? B0($),
            }),
            {}
          )
        : void 0,
    W =
      typeof Q === "string"
        ? Q
        : Q?.nameStrategy === "title"
        ? void 0
        : Q?.name,
    J =
      f(
        X._def,
        W === void 0
          ? $
          : { ...$, currentPath: [...$.basePath, $.definitionPath, W] },
        !1
      ) ?? B0($),
    G =
      typeof Q === "object" && Q.name !== void 0 && Q.nameStrategy === "title"
        ? Q.name
        : void 0;
  if (G !== void 0) J.title = G;
  if ($.flags.hasReferencedOpenAiAnyType) {
    if (!Y) Y = {};
    if (!Y[$.openAiAnyTypeName])
      Y[$.openAiAnyTypeName] = {
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref:
            $.$refStrategy === "relative"
              ? "1"
              : [...$.basePath, $.definitionPath, $.openAiAnyTypeName].join(
                  "/"
                ),
        },
      };
  }
  let H =
    W === void 0
      ? Y
        ? { ...J, [$.definitionPath]: Y }
        : J
      : {
          $ref: [
            ...($.$refStrategy === "relative" ? [] : $.basePath),
            $.definitionPath,
            W,
          ].join("/"),
          [$.definitionPath]: { ...Y, [W]: J },
        };
  if ($.target === "jsonSchema7")
    H.$schema = "http://json-schema.org/draft-07/schema#";
  else if ($.target === "jsonSchema2019-09" || $.target === "openAi")
    H.$schema = "https://json-schema.org/draft/2019-09/schema#";
  if (
    $.target === "openAi" &&
    ("anyOf" in H ||
      "oneOf" in H ||
      "allOf" in H ||
      ("type" in H && Array.isArray(H.type)))
  )
    console.warn(
      "Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property."
    );
  return H;
};
function FN(X) {
  if (!X) return "draft-7";
  if (X === "jsonSchema7" || X === "draft-7") return "draft-7";
  if (X === "jsonSchema2019-09" || X === "draft-2020-12")
    return "draft-2020-12";
  return "draft-7";
}
function n$(X, Q) {
  var $, Y, W;
  if (m0(X))
    return N$(X, {
      target: FN(Q === null || Q === void 0 ? void 0 : Q.target),
      io:
        ($ = Q === null || Q === void 0 ? void 0 : Q.pipeStrategy) !== null &&
        $ !== void 0
          ? $
          : "input",
    });
  return i$(X, {
    strictUnions:
      (Y = Q === null || Q === void 0 ? void 0 : Q.strictUnions) !== null &&
      Y !== void 0
        ? Y
        : !0,
    pipeStrategy:
      (W = Q === null || Q === void 0 ? void 0 : Q.pipeStrategy) !== null &&
      W !== void 0
        ? W
        : "input",
  });
}
function r$(X) {
  let Q = h1(X),
    $ = Q === null || Q === void 0 ? void 0 : Q.method;
  if (!$) throw Error("Schema is missing a method literal");
  let Y = p4($);
  if (typeof Y !== "string")
    throw Error("Schema method literal must be a string");
  return Y;
}
function o$(X, Q) {
  let $ = f1(X, Q);
  if (!$.success) throw $.error;
  return $.data;
}
var NN = 60000;
class t$ {
  constructor(X) {
    if (
      ((this._options = X),
      (this._requestMessageId = 0),
      (this._requestHandlers = new Map()),
      (this._requestHandlerAbortControllers = new Map()),
      (this._notificationHandlers = new Map()),
      (this._responseHandlers = new Map()),
      (this._progressHandlers = new Map()),
      (this._timeoutInfo = new Map()),
      (this._pendingDebouncedNotifications = new Set()),
      (this._taskProgressTokens = new Map()),
      (this._requestResolvers = new Map()),
      this.setNotificationHandler(a4, (Q) => {
        this._oncancel(Q);
      }),
      this.setNotificationHandler(e4, (Q) => {
        this._onprogress(Q);
      }),
      this.setRequestHandler(s4, (Q) => ({})),
      (this._taskStore = X === null || X === void 0 ? void 0 : X.taskStore),
      (this._taskMessageQueue =
        X === null || X === void 0 ? void 0 : X.taskMessageQueue),
      this._taskStore)
    )
      this.setRequestHandler(X8, async (Q, $) => {
        let Y = await this._taskStore.getTask(Q.params.taskId, $.sessionId);
        if (!Y)
          throw new k(
            x.InvalidParams,
            "Failed to retrieve task: Task not found"
          );
        return { ...Y };
      }),
        this.setRequestHandler($8, async (Q, $) => {
          let Y = async () => {
            var W;
            let J = Q.params.taskId;
            if (this._taskMessageQueue) {
              let H;
              while (
                (H = await this._taskMessageQueue.dequeue(J, $.sessionId))
              ) {
                if (H.type === "response" || H.type === "error") {
                  let B = H.message,
                    z = B.id,
                    K = this._requestResolvers.get(z);
                  if (K)
                    if (
                      (this._requestResolvers.delete(z), H.type === "response")
                    )
                      K(B);
                    else {
                      let V = B,
                        L = new k(V.error.code, V.error.message, V.error.data);
                      K(L);
                    }
                  else {
                    let V = H.type === "response" ? "Response" : "Error";
                    this._onerror(
                      Error(`${V} handler missing for request ${z}`)
                    );
                  }
                  continue;
                }
                await ((W = this._transport) === null || W === void 0
                  ? void 0
                  : W.send(H.message, { relatedRequestId: $.requestId }));
              }
            }
            let G = await this._taskStore.getTask(J, $.sessionId);
            if (!G) throw new k(x.InvalidParams, `Task not found: ${J}`);
            if (!u1(G.status))
              return await this._waitForTaskUpdate(J, $.signal), await Y();
            if (u1(G.status)) {
              let H = await this._taskStore.getTaskResult(J, $.sessionId);
              return (
                this._clearTaskQueue(J),
                { ...H, _meta: { ...H._meta, [z1]: { taskId: J } } }
              );
            }
            return await Y();
          };
          return await Y();
        }),
        this.setRequestHandler(Y8, async (Q, $) => {
          var Y;
          try {
            let { tasks: W, nextCursor: J } = await this._taskStore.listTasks(
              (Y = Q.params) === null || Y === void 0 ? void 0 : Y.cursor,
              $.sessionId
            );
            return { tasks: W, nextCursor: J, _meta: {} };
          } catch (W) {
            throw new k(
              x.InvalidParams,
              `Failed to list tasks: ${
                W instanceof Error ? W.message : String(W)
              }`
            );
          }
        }),
        this.setRequestHandler(L5, async (Q, $) => {
          try {
            let Y = await this._taskStore.getTask(Q.params.taskId, $.sessionId);
            if (!Y)
              throw new k(
                x.InvalidParams,
                `Task not found: ${Q.params.taskId}`
              );
            if (u1(Y.status))
              throw new k(
                x.InvalidParams,
                `Cannot cancel task in terminal status: ${Y.status}`
              );
            await this._taskStore.updateTaskStatus(
              Q.params.taskId,
              "cancelled",
              "Client cancelled task execution.",
              $.sessionId
            ),
              this._clearTaskQueue(Q.params.taskId);
            let W = await this._taskStore.getTask(Q.params.taskId, $.sessionId);
            if (!W)
              throw new k(
                x.InvalidParams,
                `Task not found after cancellation: ${Q.params.taskId}`
              );
            return { _meta: {}, ...W };
          } catch (Y) {
            if (Y instanceof k) throw Y;
            throw new k(
              x.InvalidRequest,
              `Failed to cancel task: ${
                Y instanceof Error ? Y.message : String(Y)
              }`
            );
          }
        });
  }
  async _oncancel(X) {
    let Q = this._requestHandlerAbortControllers.get(X.params.requestId);
    Q === null || Q === void 0 || Q.abort(X.params.reason);
  }
  _setupTimeout(X, Q, $, Y, W = !1) {
    this._timeoutInfo.set(X, {
      timeoutId: setTimeout(Y, Q),
      startTime: Date.now(),
      timeout: Q,
      maxTotalTimeout: $,
      resetTimeoutOnProgress: W,
      onTimeout: Y,
    });
  }
  _resetTimeout(X) {
    let Q = this._timeoutInfo.get(X);
    if (!Q) return !1;
    let $ = Date.now() - Q.startTime;
    if (Q.maxTotalTimeout && $ >= Q.maxTotalTimeout)
      throw (
        (this._timeoutInfo.delete(X),
        k.fromError(x.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: Q.maxTotalTimeout,
          totalElapsed: $,
        }))
      );
    return (
      clearTimeout(Q.timeoutId),
      (Q.timeoutId = setTimeout(Q.onTimeout, Q.timeout)),
      !0
    );
  }
  _cleanupTimeout(X) {
    let Q = this._timeoutInfo.get(X);
    if (Q) clearTimeout(Q.timeoutId), this._timeoutInfo.delete(X);
  }
  async connect(X) {
    var Q, $, Y;
    this._transport = X;
    let W = (Q = this.transport) === null || Q === void 0 ? void 0 : Q.onclose;
    this._transport.onclose = () => {
      W === null || W === void 0 || W(), this._onclose();
    };
    let J = ($ = this.transport) === null || $ === void 0 ? void 0 : $.onerror;
    this._transport.onerror = (H) => {
      J === null || J === void 0 || J(H), this._onerror(H);
    };
    let G =
      (Y = this._transport) === null || Y === void 0 ? void 0 : Y.onmessage;
    (this._transport.onmessage = (H, B) => {
      if ((G === null || G === void 0 || G(H, B), CX(H) || U5(H)))
        this._onresponse(H);
      else if (Z$(H)) this._onrequest(H, B);
      else if (B5(H)) this._onnotification(H);
      else this._onerror(Error(`Unknown message type: ${JSON.stringify(H)}`));
    }),
      await this._transport.start();
  }
  _onclose() {
    var X;
    let Q = this._responseHandlers;
    (this._responseHandlers = new Map()),
      this._progressHandlers.clear(),
      this._taskProgressTokens.clear(),
      this._pendingDebouncedNotifications.clear();
    let $ = k.fromError(x.ConnectionClosed, "Connection closed");
    (this._transport = void 0),
      (X = this.onclose) === null || X === void 0 || X.call(this);
    for (let Y of Q.values()) Y($);
  }
  _onerror(X) {
    var Q;
    (Q = this.onerror) === null || Q === void 0 || Q.call(this, X);
  }
  _onnotification(X) {
    var Q;
    let $ =
      (Q = this._notificationHandlers.get(X.method)) !== null && Q !== void 0
        ? Q
        : this.fallbackNotificationHandler;
    if ($ === void 0) return;
    Promise.resolve()
      .then(() => $(X))
      .catch((Y) =>
        this._onerror(Error(`Uncaught error in notification handler: ${Y}`))
      );
  }
  _onrequest(X, Q) {
    var $, Y, W, J, G, H;
    let B =
        ($ = this._requestHandlers.get(X.method)) !== null && $ !== void 0
          ? $
          : this.fallbackRequestHandler,
      z = this._transport,
      K =
        (J =
          (W = (Y = X.params) === null || Y === void 0 ? void 0 : Y._meta) ===
            null || W === void 0
            ? void 0
            : W[z1]) === null || J === void 0
          ? void 0
          : J.taskId;
    if (B === void 0) {
      let q = {
        jsonrpc: "2.0",
        id: X.id,
        error: { code: x.MethodNotFound, message: "Method not found" },
      };
      if (K && this._taskMessageQueue)
        this._enqueueTaskMessage(
          K,
          { type: "error", message: q, timestamp: Date.now() },
          z === null || z === void 0 ? void 0 : z.sessionId
        ).catch((N) =>
          this._onerror(Error(`Failed to enqueue error response: ${N}`))
        );
      else
        z === null ||
          z === void 0 ||
          z
            .send(q)
            .catch((N) =>
              this._onerror(Error(`Failed to send an error response: ${N}`))
            );
      return;
    }
    let V = new AbortController();
    this._requestHandlerAbortControllers.set(X.id, V);
    let L = (G = X.params) === null || G === void 0 ? void 0 : G.task,
      U = this._taskStore
        ? this.requestTaskStore(
            X,
            z === null || z === void 0 ? void 0 : z.sessionId
          )
        : void 0,
      F = {
        signal: V.signal,
        sessionId: z === null || z === void 0 ? void 0 : z.sessionId,
        _meta: (H = X.params) === null || H === void 0 ? void 0 : H._meta,
        sendNotification: async (q) => {
          let N = { relatedRequestId: X.id };
          if (K) N.relatedTask = { taskId: K };
          await this.notification(q, N);
        },
        sendRequest: async (q, N, w) => {
          var M, R;
          let S = { ...w, relatedRequestId: X.id };
          if (K && !S.relatedTask) S.relatedTask = { taskId: K };
          let C =
            (R =
              (M = S.relatedTask) === null || M === void 0
                ? void 0
                : M.taskId) !== null && R !== void 0
              ? R
              : K;
          if (C && U) await U.updateTaskStatus(C, "input_required");
          return await this.request(q, N, S);
        },
        authInfo: Q === null || Q === void 0 ? void 0 : Q.authInfo,
        requestId: X.id,
        requestInfo: Q === null || Q === void 0 ? void 0 : Q.requestInfo,
        taskId: K,
        taskStore: U,
        taskRequestedTtl: L === null || L === void 0 ? void 0 : L.ttl,
        closeSSEStream: Q === null || Q === void 0 ? void 0 : Q.closeSSEStream,
        closeStandaloneSSEStream:
          Q === null || Q === void 0 ? void 0 : Q.closeStandaloneSSEStream,
      };
    Promise.resolve()
      .then(() => {
        if (L) this.assertTaskHandlerCapability(X.method);
      })
      .then(() => B(X, F))
      .then(
        async (q) => {
          if (V.signal.aborted) return;
          let N = { result: q, jsonrpc: "2.0", id: X.id };
          if (K && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              K,
              { type: "response", message: N, timestamp: Date.now() },
              z === null || z === void 0 ? void 0 : z.sessionId
            );
          else await (z === null || z === void 0 ? void 0 : z.send(N));
        },
        async (q) => {
          var N;
          if (V.signal.aborted) return;
          let w = {
            jsonrpc: "2.0",
            id: X.id,
            error: {
              code: Number.isSafeInteger(q.code) ? q.code : x.InternalError,
              message:
                (N = q.message) !== null && N !== void 0 ? N : "Internal error",
              ...(q.data !== void 0 && { data: q.data }),
            },
          };
          if (K && this._taskMessageQueue)
            await this._enqueueTaskMessage(
              K,
              { type: "error", message: w, timestamp: Date.now() },
              z === null || z === void 0 ? void 0 : z.sessionId
            );
          else await (z === null || z === void 0 ? void 0 : z.send(w));
        }
      )
      .catch((q) => this._onerror(Error(`Failed to send response: ${q}`)))
      .finally(() => {
        this._requestHandlerAbortControllers.delete(X.id);
      });
  }
  _onprogress(X) {
    let { progressToken: Q, ...$ } = X.params,
      Y = Number(Q),
      W = this._progressHandlers.get(Y);
    if (!W) {
      this._onerror(
        Error(
          `Received a progress notification for an unknown token: ${JSON.stringify(
            X
          )}`
        )
      );
      return;
    }
    let J = this._responseHandlers.get(Y),
      G = this._timeoutInfo.get(Y);
    if (G && J && G.resetTimeoutOnProgress)
      try {
        this._resetTimeout(Y);
      } catch (H) {
        this._responseHandlers.delete(Y),
          this._progressHandlers.delete(Y),
          this._cleanupTimeout(Y),
          J(H);
        return;
      }
    W($);
  }
  _onresponse(X) {
    let Q = Number(X.id),
      $ = this._requestResolvers.get(Q);
    if ($) {
      if ((this._requestResolvers.delete(Q), CX(X))) $(X);
      else {
        let J = new k(X.error.code, X.error.message, X.error.data);
        $(J);
      }
      return;
    }
    let Y = this._responseHandlers.get(Q);
    if (Y === void 0) {
      this._onerror(
        Error(
          `Received a response for an unknown message ID: ${JSON.stringify(X)}`
        )
      );
      return;
    }
    this._responseHandlers.delete(Q), this._cleanupTimeout(Q);
    let W = !1;
    if (CX(X) && X.result && typeof X.result === "object") {
      let J = X.result;
      if (J.task && typeof J.task === "object") {
        let G = J.task;
        if (typeof G.taskId === "string")
          (W = !0), this._taskProgressTokens.set(G.taskId, Q);
      }
    }
    if (!W) this._progressHandlers.delete(Q);
    if (CX(X)) Y(X);
    else {
      let J = k.fromError(X.error.code, X.error.message, X.error.data);
      Y(J);
    }
  }
  get transport() {
    return this._transport;
  }
  async close() {
    var X;
    await ((X = this._transport) === null || X === void 0 ? void 0 : X.close());
  }
  async *requestStream(X, Q, $) {
    var Y, W, J, G;
    let { task: H } = $ !== null && $ !== void 0 ? $ : {};
    if (!H) {
      try {
        yield { type: "result", result: await this.request(X, Q, $) };
      } catch (z) {
        yield {
          type: "error",
          error: z instanceof k ? z : new k(x.InternalError, String(z)),
        };
      }
      return;
    }
    let B;
    try {
      let z = await this.request(X, _6, $);
      if (z.task)
        (B = z.task.taskId), yield { type: "taskCreated", task: z.task };
      else throw new k(x.InternalError, "Task creation did not return a task");
      while (!0) {
        let K = await this.getTask({ taskId: B }, $);
        if ((yield { type: "taskStatus", task: K }, u1(K.status))) {
          if (K.status === "completed")
            yield {
              type: "result",
              result: await this.getTaskResult({ taskId: B }, Q, $),
            };
          else if (K.status === "failed")
            yield {
              type: "error",
              error: new k(x.InternalError, `Task ${B} failed`),
            };
          else if (K.status === "cancelled")
            yield {
              type: "error",
              error: new k(x.InternalError, `Task ${B} was cancelled`),
            };
          return;
        }
        if (K.status === "input_required") {
          yield {
            type: "result",
            result: await this.getTaskResult({ taskId: B }, Q, $),
          };
          return;
        }
        let V =
          (J =
            (Y = K.pollInterval) !== null && Y !== void 0
              ? Y
              : (W = this._options) === null || W === void 0
              ? void 0
              : W.defaultTaskPollInterval) !== null && J !== void 0
            ? J
            : 1000;
        await new Promise((L) => setTimeout(L, V)),
          (G = $ === null || $ === void 0 ? void 0 : $.signal) === null ||
            G === void 0 ||
            G.throwIfAborted();
      }
    } catch (z) {
      yield {
        type: "error",
        error: z instanceof k ? z : new k(x.InternalError, String(z)),
      };
    }
  }
  request(X, Q, $) {
    let {
      relatedRequestId: Y,
      resumptionToken: W,
      onresumptiontoken: J,
      task: G,
      relatedTask: H,
    } = $ !== null && $ !== void 0 ? $ : {};
    return new Promise((B, z) => {
      var K, V, L, U, F, q, N;
      let w = (s) => {
        z(s);
      };
      if (!this._transport) {
        w(Error("Not connected"));
        return;
      }
      if (
        ((K = this._options) === null || K === void 0
          ? void 0
          : K.enforceStrictCapabilities) === !0
      )
        try {
          if ((this.assertCapabilityForMethod(X.method), G))
            this.assertTaskCapability(X.method);
        } catch (s) {
          w(s);
          return;
        }
      (V = $ === null || $ === void 0 ? void 0 : $.signal) === null ||
        V === void 0 ||
        V.throwIfAborted();
      let M = this._requestMessageId++,
        R = { ...X, jsonrpc: "2.0", id: M };
      if ($ === null || $ === void 0 ? void 0 : $.onprogress)
        this._progressHandlers.set(M, $.onprogress),
          (R.params = {
            ...X.params,
            _meta: {
              ...(((L = X.params) === null || L === void 0
                ? void 0
                : L._meta) || {}),
              progressToken: M,
            },
          });
      if (G) R.params = { ...R.params, task: G };
      if (H)
        R.params = {
          ...R.params,
          _meta: {
            ...(((U = R.params) === null || U === void 0 ? void 0 : U._meta) ||
              {}),
            [z1]: H,
          },
        };
      let S = (s) => {
        var D0;
        this._responseHandlers.delete(M),
          this._progressHandlers.delete(M),
          this._cleanupTimeout(M),
          (D0 = this._transport) === null ||
            D0 === void 0 ||
            D0.send(
              {
                jsonrpc: "2.0",
                method: "notifications/cancelled",
                params: { requestId: M, reason: String(s) },
              },
              { relatedRequestId: Y, resumptionToken: W, onresumptiontoken: J }
            ).catch((L1) =>
              this._onerror(Error(`Failed to send cancellation: ${L1}`))
            );
        let q0 = s instanceof k ? s : new k(x.RequestTimeout, String(s));
        z(q0);
      };
      this._responseHandlers.set(M, (s) => {
        var D0;
        if (
          (D0 = $ === null || $ === void 0 ? void 0 : $.signal) === null ||
          D0 === void 0
            ? void 0
            : D0.aborted
        )
          return;
        if (s instanceof Error) return z(s);
        try {
          let q0 = f1(Q, s.result);
          if (!q0.success) z(q0.error);
          else B(q0.data);
        } catch (q0) {
          z(q0);
        }
      }),
        (F = $ === null || $ === void 0 ? void 0 : $.signal) === null ||
          F === void 0 ||
          F.addEventListener("abort", () => {
            var s;
            S(
              (s = $ === null || $ === void 0 ? void 0 : $.signal) === null ||
                s === void 0
                ? void 0
                : s.reason
            );
          });
      let C =
          (q = $ === null || $ === void 0 ? void 0 : $.timeout) !== null &&
          q !== void 0
            ? q
            : NN,
        K0 = () =>
          S(k.fromError(x.RequestTimeout, "Request timed out", { timeout: C }));
      this._setupTimeout(
        M,
        C,
        $ === null || $ === void 0 ? void 0 : $.maxTotalTimeout,
        K0,
        (N = $ === null || $ === void 0 ? void 0 : $.resetTimeoutOnProgress) !==
          null && N !== void 0
          ? N
          : !1
      );
      let U0 = H === null || H === void 0 ? void 0 : H.taskId;
      if (U0) {
        let s = (D0) => {
          let q0 = this._responseHandlers.get(M);
          if (q0) q0(D0);
          else
            this._onerror(
              Error(`Response handler missing for side-channeled request ${M}`)
            );
        };
        this._requestResolvers.set(M, s),
          this._enqueueTaskMessage(U0, {
            type: "request",
            message: R,
            timestamp: Date.now(),
          }).catch((D0) => {
            this._cleanupTimeout(M), z(D0);
          });
      } else
        this._transport
          .send(R, {
            relatedRequestId: Y,
            resumptionToken: W,
            onresumptiontoken: J,
          })
          .catch((s) => {
            this._cleanupTimeout(M), z(s);
          });
    });
  }
  async getTask(X, Q) {
    return this.request({ method: "tasks/get", params: X }, Q8, Q);
  }
  async getTaskResult(X, Q, $) {
    return this.request({ method: "tasks/result", params: X }, Q, $);
  }
  async listTasks(X, Q) {
    return this.request({ method: "tasks/list", params: X }, W8, Q);
  }
  async cancelTask(X, Q) {
    return this.request({ method: "tasks/cancel", params: X }, q5, Q);
  }
  async notification(X, Q) {
    var $, Y, W, J, G;
    if (!this._transport) throw Error("Not connected");
    this.assertNotificationCapability(X.method);
    let H =
      ($ = Q === null || Q === void 0 ? void 0 : Q.relatedTask) === null ||
      $ === void 0
        ? void 0
        : $.taskId;
    if (H) {
      let V = {
        ...X,
        jsonrpc: "2.0",
        params: {
          ...X.params,
          _meta: {
            ...(((Y = X.params) === null || Y === void 0 ? void 0 : Y._meta) ||
              {}),
            [z1]: Q.relatedTask,
          },
        },
      };
      await this._enqueueTaskMessage(H, {
        type: "notification",
        message: V,
        timestamp: Date.now(),
      });
      return;
    }
    if (
      ((J =
        (W = this._options) === null || W === void 0
          ? void 0
          : W.debouncedNotificationMethods) !== null && J !== void 0
        ? J
        : []
      ).includes(X.method) &&
      !X.params &&
      !(Q === null || Q === void 0 ? void 0 : Q.relatedRequestId) &&
      !(Q === null || Q === void 0 ? void 0 : Q.relatedTask)
    ) {
      if (this._pendingDebouncedNotifications.has(X.method)) return;
      this._pendingDebouncedNotifications.add(X.method),
        Promise.resolve().then(() => {
          var V, L;
          if (
            (this._pendingDebouncedNotifications.delete(X.method),
            !this._transport)
          )
            return;
          let U = { ...X, jsonrpc: "2.0" };
          if (Q === null || Q === void 0 ? void 0 : Q.relatedTask)
            U = {
              ...U,
              params: {
                ...U.params,
                _meta: {
                  ...(((V = U.params) === null || V === void 0
                    ? void 0
                    : V._meta) || {}),
                  [z1]: Q.relatedTask,
                },
              },
            };
          (L = this._transport) === null ||
            L === void 0 ||
            L.send(U, Q).catch((F) => this._onerror(F));
        });
      return;
    }
    let K = { ...X, jsonrpc: "2.0" };
    if (Q === null || Q === void 0 ? void 0 : Q.relatedTask)
      K = {
        ...K,
        params: {
          ...K.params,
          _meta: {
            ...(((G = K.params) === null || G === void 0 ? void 0 : G._meta) ||
              {}),
            [z1]: Q.relatedTask,
          },
        },
      };
    await this._transport.send(K, Q);
  }
  setRequestHandler(X, Q) {
    let $ = r$(X);
    this.assertRequestHandlerCapability($),
      this._requestHandlers.set($, (Y, W) => {
        let J = o$(X, Y);
        return Promise.resolve(Q(J, W));
      });
  }
  removeRequestHandler(X) {
    this._requestHandlers.delete(X);
  }
  assertCanSetRequestHandler(X) {
    if (this._requestHandlers.has(X))
      throw Error(
        `A request handler for ${X} already exists, which would be overridden`
      );
  }
  setNotificationHandler(X, Q) {
    let $ = r$(X);
    this._notificationHandlers.set($, (Y) => {
      let W = o$(X, Y);
      return Promise.resolve(Q(W));
    });
  }
  removeNotificationHandler(X) {
    this._notificationHandlers.delete(X);
  }
  _cleanupTaskProgressHandler(X) {
    let Q = this._taskProgressTokens.get(X);
    if (Q !== void 0)
      this._progressHandlers.delete(Q), this._taskProgressTokens.delete(X);
  }
  async _enqueueTaskMessage(X, Q, $) {
    var Y;
    if (!this._taskStore || !this._taskMessageQueue)
      throw Error(
        "Cannot enqueue task message: taskStore and taskMessageQueue are not configured"
      );
    let W =
      (Y = this._options) === null || Y === void 0
        ? void 0
        : Y.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(X, Q, $, W);
  }
  async _clearTaskQueue(X, Q) {
    if (this._taskMessageQueue) {
      let $ = await this._taskMessageQueue.dequeueAll(X, Q);
      for (let Y of $)
        if (Y.type === "request" && Z$(Y.message)) {
          let W = Y.message.id,
            J = this._requestResolvers.get(W);
          if (J)
            J(new k(x.InternalError, "Task cancelled or completed")),
              this._requestResolvers.delete(W);
          else
            this._onerror(
              Error(
                `Resolver missing for request ${W} during task ${X} cleanup`
              )
            );
        }
    }
  }
  async _waitForTaskUpdate(X, Q) {
    var $, Y, W;
    let J =
      (Y =
        ($ = this._options) === null || $ === void 0
          ? void 0
          : $.defaultTaskPollInterval) !== null && Y !== void 0
        ? Y
        : 1000;
    try {
      let G = await ((W = this._taskStore) === null || W === void 0
        ? void 0
        : W.getTask(X));
      if (G === null || G === void 0 ? void 0 : G.pollInterval)
        J = G.pollInterval;
    } catch (G) {}
    return new Promise((G, H) => {
      if (Q.aborted) {
        H(new k(x.InvalidRequest, "Request cancelled"));
        return;
      }
      let B = setTimeout(G, J);
      Q.addEventListener(
        "abort",
        () => {
          clearTimeout(B), H(new k(x.InvalidRequest, "Request cancelled"));
        },
        { once: !0 }
      );
    });
  }
  requestTaskStore(X, Q) {
    let $ = this._taskStore;
    if (!$) throw Error("No task store configured");
    return {
      createTask: async (Y) => {
        if (!X) throw Error("No request provided");
        return await $.createTask(
          Y,
          X.id,
          { method: X.method, params: X.params },
          Q
        );
      },
      getTask: async (Y) => {
        let W = await $.getTask(Y, Q);
        if (!W)
          throw new k(
            x.InvalidParams,
            "Failed to retrieve task: Task not found"
          );
        return W;
      },
      storeTaskResult: async (Y, W, J) => {
        await $.storeTaskResult(Y, W, J, Q);
        let G = await $.getTask(Y, Q);
        if (G) {
          let H = xX.parse({ method: "notifications/tasks/status", params: G });
          if ((await this.notification(H), u1(G.status)))
            this._cleanupTaskProgressHandler(Y);
        }
      },
      getTaskResult: (Y) => {
        return $.getTaskResult(Y, Q);
      },
      updateTaskStatus: async (Y, W, J) => {
        let G = await $.getTask(Y, Q);
        if (!G)
          throw new k(
            x.InvalidParams,
            `Task "${Y}" not found - it may have been cleaned up`
          );
        if (u1(G.status))
          throw new k(
            x.InvalidParams,
            `Cannot update task "${Y}" from terminal status "${G.status}" to "${W}". Terminal states (completed, failed, cancelled) cannot transition to other states.`
          );
        await $.updateTaskStatus(Y, W, J, Q);
        let H = await $.getTask(Y, Q);
        if (H) {
          let B = xX.parse({ method: "notifications/tasks/status", params: H });
          if ((await this.notification(B), u1(H.status)))
            this._cleanupTaskProgressHandler(Y);
        }
      },
      listTasks: (Y) => {
        return $.listTasks(Y, Q);
      },
    };
  }
}
function QG(X) {
  return X !== null && typeof X === "object" && !Array.isArray(X);
}
function $G(X, Q) {
  let $ = { ...X };
  for (let Y in Q) {
    let W = Y,
      J = Q[W];
    if (J === void 0) continue;
    let G = $[W];
    if (QG(G) && QG(J)) $[W] = { ...G, ...J };
    else $[W] = J;
  }
  return $;
}
var hz = K7(cY(), 1),
  uz = K7(fz(), 1);
function II() {
  let X = new hz.Ajv({
    strict: !1,
    validateFormats: !0,
    validateSchema: !1,
    allErrors: !0,
  });
  return uz.default(X), X;
}
class eY {
  constructor(X) {
    this._ajv = X !== null && X !== void 0 ? X : II();
  }
  getValidator(X) {
    var Q;
    let $ =
      "$id" in X && typeof X.$id === "string"
        ? (Q = this._ajv.getSchema(X.$id)) !== null && Q !== void 0
          ? Q
          : this._ajv.compile(X)
        : this._ajv.compile(X);
    return (Y) => {
      if ($(Y)) return { valid: !0, data: Y, errorMessage: void 0 };
      else
        return {
          valid: !1,
          data: void 0,
          errorMessage: this._ajv.errorsText($.errors),
        };
    };
  }
}
class X7 {
  constructor(X) {
    this._server = X;
  }
  requestStream(X, Q, $) {
    return this._server.requestStream(X, Q, $);
  }
  async getTask(X, Q) {
    return this._server.getTask({ taskId: X }, Q);
  }
  async getTaskResult(X, Q, $) {
    return this._server.getTaskResult({ taskId: X }, Q, $);
  }
  async listTasks(X, Q) {
    return this._server.listTasks(X ? { cursor: X } : void 0, Q);
  }
  async cancelTask(X, Q) {
    return this._server.cancelTask({ taskId: X }, Q);
  }
}
function lz(X, Q, $) {
  var Y;
  if (!X)
    throw Error(`${$} does not support task creation (required for ${Q})`);
  switch (Q) {
    case "tools/call":
      if (!((Y = X.tools) === null || Y === void 0 ? void 0 : Y.call))
        throw Error(
          `${$} does not support task creation for tools/call (required for ${Q})`
        );
      break;
    default:
      break;
  }
}
function mz(X, Q, $) {
  var Y, W;
  if (!X)
    throw Error(`${$} does not support task creation (required for ${Q})`);
  switch (Q) {
    case "sampling/createMessage":
      if (
        !((Y = X.sampling) === null || Y === void 0 ? void 0 : Y.createMessage)
      )
        throw Error(
          `${$} does not support task creation for sampling/createMessage (required for ${Q})`
        );
      break;
    case "elicitation/create":
      if (!((W = X.elicitation) === null || W === void 0 ? void 0 : W.create))
        throw Error(
          `${$} does not support task creation for elicitation/create (required for ${Q})`
        );
      break;
    default:
      break;
  }
}
class Q7 extends t$ {
  constructor(X, Q) {
    var $, Y;
    super(Q);
    if (
      ((this._serverInfo = X),
      (this._loggingLevels = new Map()),
      (this.LOG_LEVEL_SEVERITY = new Map(yX.options.map((W, J) => [W, J]))),
      (this.isMessageIgnored = (W, J) => {
        let G = this._loggingLevels.get(J);
        return G
          ? this.LOG_LEVEL_SEVERITY.get(W) < this.LOG_LEVEL_SEVERITY.get(G)
          : !1;
      }),
      (this._capabilities =
        ($ = Q === null || Q === void 0 ? void 0 : Q.capabilities) !== null &&
        $ !== void 0
          ? $
          : {}),
      (this._instructions =
        Q === null || Q === void 0 ? void 0 : Q.instructions),
      (this._jsonSchemaValidator =
        (Y = Q === null || Q === void 0 ? void 0 : Q.jsonSchemaValidator) !==
          null && Y !== void 0
          ? Y
          : new eY()),
      this.setRequestHandler(C$, (W) => this._oninitialize(W)),
      this.setNotificationHandler(k$, () => {
        var W;
        return (W = this.oninitialized) === null || W === void 0
          ? void 0
          : W.call(this);
      }),
      this._capabilities.logging)
    )
      this.setRequestHandler(f$, async (W, J) => {
        var G;
        let H =
            J.sessionId ||
            ((G = J.requestInfo) === null || G === void 0
              ? void 0
              : G.headers["mcp-session-id"]) ||
            void 0,
          { level: B } = W.params,
          z = yX.safeParse(B);
        if (z.success) this._loggingLevels.set(H, z.data);
        return {};
      });
  }
  get experimental() {
    if (!this._experimental) this._experimental = { tasks: new X7(this) };
    return this._experimental;
  }
  registerCapabilities(X) {
    if (this.transport)
      throw Error("Cannot register capabilities after connecting to transport");
    this._capabilities = $G(this._capabilities, X);
  }
  setRequestHandler(X, Q) {
    var $, Y, W;
    let J = h1(X),
      G = J === null || J === void 0 ? void 0 : J.method;
    if (!G) throw Error("Schema is missing a method literal");
    let H;
    if (m0(G)) {
      let z = G,
        K = ($ = z._zod) === null || $ === void 0 ? void 0 : $.def;
      H =
        (Y = K === null || K === void 0 ? void 0 : K.value) !== null &&
        Y !== void 0
          ? Y
          : z.value;
    } else {
      let z = G,
        K = z._def;
      H =
        (W = K === null || K === void 0 ? void 0 : K.value) !== null &&
        W !== void 0
          ? W
          : z.value;
    }
    if (typeof H !== "string")
      throw Error("Schema method literal must be a string");
    if (H === "tools/call") {
      let z = async (K, V) => {
        let L = f1(y6, K);
        if (!L.success) {
          let N = L.error instanceof Error ? L.error.message : String(L.error);
          throw new k(x.InvalidParams, `Invalid tools/call request: ${N}`);
        }
        let { params: U } = L.data,
          F = await Promise.resolve(Q(K, V));
        if (U.task) {
          let N = f1(_6, F);
          if (!N.success) {
            let w =
              N.error instanceof Error ? N.error.message : String(N.error);
            throw new k(x.InvalidParams, `Invalid task creation result: ${w}`);
          }
          return N.data;
        }
        let q = f1(U8, F);
        if (!q.success) {
          let N = q.error instanceof Error ? q.error.message : String(q.error);
          throw new k(x.InvalidParams, `Invalid tools/call result: ${N}`);
        }
        return q.data;
      };
      return super.setRequestHandler(X, z);
    }
    return super.setRequestHandler(X, Q);
  }
  assertCapabilityForMethod(X) {
    var Q, $, Y;
    switch (X) {
      case "sampling/createMessage":
        if (
          !((Q = this._clientCapabilities) === null || Q === void 0
            ? void 0
            : Q.sampling)
        )
          throw Error(`Client does not support sampling (required for ${X})`);
        break;
      case "elicitation/create":
        if (
          !(($ = this._clientCapabilities) === null || $ === void 0
            ? void 0
            : $.elicitation)
        )
          throw Error(
            `Client does not support elicitation (required for ${X})`
          );
        break;
      case "roots/list":
        if (
          !((Y = this._clientCapabilities) === null || Y === void 0
            ? void 0
            : Y.roots)
        )
          throw Error(
            `Client does not support listing roots (required for ${X})`
          );
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(X) {
    var Q, $;
    switch (X) {
      case "notifications/message":
        if (!this._capabilities.logging)
          throw Error(`Server does not support logging (required for ${X})`);
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources)
          throw Error(
            `Server does not support notifying about resources (required for ${X})`
          );
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools)
          throw Error(
            `Server does not support notifying of tool list changes (required for ${X})`
          );
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts)
          throw Error(
            `Server does not support notifying of prompt list changes (required for ${X})`
          );
        break;
      case "notifications/elicitation/complete":
        if (
          !(($ =
            (Q = this._clientCapabilities) === null || Q === void 0
              ? void 0
              : Q.elicitation) === null || $ === void 0
            ? void 0
            : $.url)
        )
          throw Error(
            `Client does not support URL elicitation (required for ${X})`
          );
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(X) {
    if (!this._capabilities) return;
    switch (X) {
      case "completion/complete":
        if (!this._capabilities.completions)
          throw Error(
            `Server does not support completions (required for ${X})`
          );
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging)
          throw Error(`Server does not support logging (required for ${X})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts)
          throw Error(`Server does not support prompts (required for ${X})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources)
          throw Error(`Server does not support resources (required for ${X})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools)
          throw Error(`Server does not support tools (required for ${X})`);
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks)
          throw Error(
            `Server does not support tasks capability (required for ${X})`
          );
        break;
      case "ping":
      case "initialize":
        break;
    }
  }
  assertTaskCapability(X) {
    var Q, $;
    mz(
      ($ =
        (Q = this._clientCapabilities) === null || Q === void 0
          ? void 0
          : Q.tasks) === null || $ === void 0
        ? void 0
        : $.requests,
      X,
      "Client"
    );
  }
  assertTaskHandlerCapability(X) {
    var Q;
    if (!this._capabilities) return;
    lz(
      (Q = this._capabilities.tasks) === null || Q === void 0
        ? void 0
        : Q.requests,
      X,
      "Server"
    );
  }
  async _oninitialize(X) {
    let Q = X.params.protocolVersion;
    return (
      (this._clientCapabilities = X.params.capabilities),
      (this._clientVersion = X.params.clientInfo),
      {
        protocolVersion: Y5.includes(Q) ? Q : P$,
        capabilities: this.getCapabilities(),
        serverInfo: this._serverInfo,
        ...(this._instructions && { instructions: this._instructions }),
      }
    );
  }
  getClientCapabilities() {
    return this._clientCapabilities;
  }
  getClientVersion() {
    return this._clientVersion;
  }
  getCapabilities() {
    return this._capabilities;
  }
  async ping() {
    return this.request({ method: "ping" }, t4);
  }
  async createMessage(X, Q) {
    var $, Y;
    if (X.tools || X.toolChoice) {
      if (
        !((Y =
          ($ = this._clientCapabilities) === null || $ === void 0
            ? void 0
            : $.sampling) === null || Y === void 0
          ? void 0
          : Y.tools)
      )
        throw Error("Client does not support sampling tools capability.");
    }
    if (X.messages.length > 0) {
      let W = X.messages[X.messages.length - 1],
        J = Array.isArray(W.content) ? W.content : [W.content],
        G = J.some((K) => K.type === "tool_result"),
        H = X.messages.length > 1 ? X.messages[X.messages.length - 2] : void 0,
        B = H ? (Array.isArray(H.content) ? H.content : [H.content]) : [],
        z = B.some((K) => K.type === "tool_use");
      if (G) {
        if (J.some((K) => K.type !== "tool_result"))
          throw Error(
            "The last message must contain only tool_result content if any is present"
          );
        if (!z)
          throw Error(
            "tool_result blocks are not matching any tool_use from the previous message"
          );
      }
      if (z) {
        let K = new Set(
            B.filter((L) => L.type === "tool_use").map((L) => L.id)
          ),
          V = new Set(
            J.filter((L) => L.type === "tool_result").map((L) => L.toolUseId)
          );
        if (K.size !== V.size || ![...K].every((L) => V.has(L)))
          throw Error(
            "ids of tool_result blocks and tool_use blocks from previous message do not match"
          );
      }
    }
    if (X.tools)
      return this.request(
        { method: "sampling/createMessage", params: X },
        u$,
        Q
      );
    return this.request({ method: "sampling/createMessage", params: X }, h$, Q);
  }
  async elicitInput(X, Q) {
    var $, Y, W, J, G;
    switch (($ = X.mode) !== null && $ !== void 0 ? $ : "form") {
      case "url": {
        if (
          !((W =
            (Y = this._clientCapabilities) === null || Y === void 0
              ? void 0
              : Y.elicitation) === null || W === void 0
            ? void 0
            : W.url)
        )
          throw Error("Client does not support url elicitation.");
        let B = X;
        return this.request({ method: "elicitation/create", params: B }, V8, Q);
      }
      case "form": {
        if (
          !((G =
            (J = this._clientCapabilities) === null || J === void 0
              ? void 0
              : J.elicitation) === null || G === void 0
            ? void 0
            : G.form)
        )
          throw Error("Client does not support form elicitation.");
        let B = X.mode === "form" ? X : { ...X, mode: "form" },
          z = await this.request(
            { method: "elicitation/create", params: B },
            V8,
            Q
          );
        if (z.action === "accept" && z.content && B.requestedSchema)
          try {
            let V = this._jsonSchemaValidator.getValidator(B.requestedSchema)(
              z.content
            );
            if (!V.valid)
              throw new k(
                x.InvalidParams,
                `Elicitation response content does not match requested schema: ${V.errorMessage}`
              );
          } catch (K) {
            if (K instanceof k) throw K;
            throw new k(
              x.InternalError,
              `Error validating elicitation response: ${
                K instanceof Error ? K.message : String(K)
              }`
            );
          }
        return z;
      }
    }
  }
  createElicitationCompletionNotifier(X, Q) {
    var $, Y;
    if (
      !((Y =
        ($ = this._clientCapabilities) === null || $ === void 0
          ? void 0
          : $.elicitation) === null || Y === void 0
        ? void 0
        : Y.url)
    )
      throw Error(
        "Client does not support URL elicitation (required for notifications/elicitation/complete)"
      );
    return () =>
      this.notification(
        {
          method: "notifications/elicitation/complete",
          params: { elicitationId: X },
        },
        Q
      );
  }
  async listRoots(X, Q) {
    return this.request({ method: "roots/list", params: X }, l$, Q);
  }
  async sendLoggingMessage(X, Q) {
    if (this._capabilities.logging) {
      if (!this.isMessageIgnored(X.level, Q))
        return this.notification({
          method: "notifications/message",
          params: X,
        });
    }
  }
  async sendResourceUpdated(X) {
    return this.notification({
      method: "notifications/resources/updated",
      params: X,
    });
  }
  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed",
    });
  }
  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }
  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }
}
var pz = Symbol.for("mcp.completable");
function dz(X) {
  return !!X && typeof X === "object" && pz in X;
}
function iz(X) {
  let Q = X[pz];
  return Q === null || Q === void 0 ? void 0 : Q.complete;
}
var cz;
(function (X) {
  X.Completable = "McpCompletable";
})(cz || (cz = {}));
var EI = /^[A-Za-z0-9._-]{1,128}$/;
function bI(X) {
  let Q = [];
  if (X.length === 0)
    return { isValid: !1, warnings: ["Tool name cannot be empty"] };
  if (X.length > 128)
    return {
      isValid: !1,
      warnings: [
        `Tool name exceeds maximum length of 128 characters (current: ${X.length})`,
      ],
    };
  if (X.includes(" "))
    Q.push("Tool name contains spaces, which may cause parsing issues");
  if (X.includes(","))
    Q.push("Tool name contains commas, which may cause parsing issues");
  if (X.startsWith("-") || X.endsWith("-"))
    Q.push(
      "Tool name starts or ends with a dash, which may cause parsing issues in some contexts"
    );
  if (X.startsWith(".") || X.endsWith("."))
    Q.push(
      "Tool name starts or ends with a dot, which may cause parsing issues in some contexts"
    );
  if (!EI.test(X)) {
    let $ = X.split("")
      .filter((Y) => !/[A-Za-z0-9._-]/.test(Y))
      .filter((Y, W, J) => J.indexOf(Y) === W);
    return (
      Q.push(
        `Tool name contains invalid characters: ${$.map((Y) => `"${Y}"`).join(
          ", "
        )}`,
        "Allowed characters are: A-Z, a-z, 0-9, underscore (_), dash (-), and dot (.)"
      ),
      { isValid: !1, warnings: Q }
    );
  }
  return { isValid: !0, warnings: Q };
}
function PI(X, Q) {
  if (Q.length > 0) {
    console.warn(`Tool name validation warning for "${X}":`);
    for (let $ of Q) console.warn(`  - ${$}`);
    console.warn(
      "Tool registration will proceed, but this may cause compatibility issues."
    ),
      console.warn(
        "Consider updating the tool name to conform to the MCP tool naming standard."
      ),
      console.warn(
        "See SEP: Specify Format for Tool Names (https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986) for more details."
      );
  }
}
function $7(X) {
  let Q = bI(X);
  return PI(X, Q.warnings), Q.isValid;
}
class Y7 {
  constructor(X) {
    this._mcpServer = X;
  }
  registerToolTask(X, Q, $) {
    let Y = { taskSupport: "required", ...Q.execution };
    if (Y.taskSupport === "forbidden")
      throw Error(
        `Cannot register task-based tool '${X}' with taskSupport 'forbidden'. Use registerTool() instead.`
      );
    return this._mcpServer._createRegisteredTool(
      X,
      Q.title,
      Q.description,
      Q.inputSchema,
      Q.outputSchema,
      Q.annotations,
      Y,
      Q._meta,
      $
    );
  }
}
class J7 {
  constructor(X, Q) {
    (this._registeredResources = {}),
      (this._registeredResourceTemplates = {}),
      (this._registeredTools = {}),
      (this._registeredPrompts = {}),
      (this._toolHandlersInitialized = !1),
      (this._completionHandlerInitialized = !1),
      (this._resourceHandlersInitialized = !1),
      (this._promptHandlersInitialized = !1),
      (this.server = new Q7(X, Q));
  }
  get experimental() {
    if (!this._experimental) this._experimental = { tasks: new Y7(this) };
    return this._experimental;
  }
  async connect(X) {
    return await this.server.connect(X);
  }
  async close() {
    await this.server.close();
  }
  setToolRequestHandlers() {
    if (this._toolHandlersInitialized) return;
    this.server.assertCanSetRequestHandler(r1(K8)),
      this.server.assertCanSetRequestHandler(r1(y6)),
      this.server.registerCapabilities({ tools: { listChanged: !0 } }),
      this.server.setRequestHandler(K8, () => ({
        tools: Object.entries(this._registeredTools)
          .filter(([, X]) => X.enabled)
          .map(([X, Q]) => {
            let $ = {
              name: X,
              title: Q.title,
              description: Q.description,
              inputSchema: (() => {
                let Y = v6(Q.inputSchema);
                return Y
                  ? n$(Y, { strictUnions: !0, pipeStrategy: "input" })
                  : SI;
              })(),
              annotations: Q.annotations,
              execution: Q.execution,
              _meta: Q._meta,
            };
            if (Q.outputSchema) {
              let Y = v6(Q.outputSchema);
              if (Y)
                $.outputSchema = n$(Y, {
                  strictUnions: !0,
                  pipeStrategy: "output",
                });
            }
            return $;
          }),
      })),
      this.server.setRequestHandler(y6, async (X, Q) => {
        var $;
        try {
          let Y = this._registeredTools[X.params.name];
          if (!Y)
            throw new k(x.InvalidParams, `Tool ${X.params.name} not found`);
          if (!Y.enabled)
            throw new k(x.InvalidParams, `Tool ${X.params.name} disabled`);
          let W = !!X.params.task,
            J =
              ($ = Y.execution) === null || $ === void 0
                ? void 0
                : $.taskSupport,
            G = "createTask" in Y.handler;
          if ((J === "required" || J === "optional") && !G)
            throw new k(
              x.InternalError,
              `Tool ${X.params.name} has taskSupport '${J}' but was not registered with registerToolTask`
            );
          if (J === "required" && !W)
            throw new k(
              x.MethodNotFound,
              `Tool ${X.params.name} requires task augmentation (taskSupport: 'required')`
            );
          if (J === "optional" && !W && G)
            return await this.handleAutomaticTaskPolling(Y, X, Q);
          let H = await this.validateToolInput(
              Y,
              X.params.arguments,
              X.params.name
            ),
            B = await this.executeToolHandler(Y, H, Q);
          if (W) return B;
          return await this.validateToolOutput(Y, B, X.params.name), B;
        } catch (Y) {
          if (Y instanceof k) {
            if (Y.code === x.UrlElicitationRequired) throw Y;
          }
          return this.createToolError(
            Y instanceof Error ? Y.message : String(Y)
          );
        }
      }),
      (this._toolHandlersInitialized = !0);
  }
  createToolError(X) {
    return { content: [{ type: "text", text: X }], isError: !0 };
  }
  async validateToolInput(X, Q, $) {
    if (!X.inputSchema) return;
    let Y = v6(X.inputSchema),
      W = Y !== null && Y !== void 0 ? Y : X.inputSchema,
      J = await m4(W, Q);
    if (!J.success) {
      let G = "error" in J ? J.error : "Unknown error",
        H = c4(G);
      throw new k(
        x.InvalidParams,
        `Input validation error: Invalid arguments for tool ${$}: ${H}`
      );
    }
    return J.data;
  }
  async validateToolOutput(X, Q, $) {
    if (!X.outputSchema) return;
    if (!("content" in Q)) return;
    if (Q.isError) return;
    if (!Q.structuredContent)
      throw new k(
        x.InvalidParams,
        `Output validation error: Tool ${$} has an output schema but no structured content was provided`
      );
    let Y = v6(X.outputSchema),
      W = await m4(Y, Q.structuredContent);
    if (!W.success) {
      let J = "error" in W ? W.error : "Unknown error",
        G = c4(J);
      throw new k(
        x.InvalidParams,
        `Output validation error: Invalid structured content for tool ${$}: ${G}`
      );
    }
  }
  async executeToolHandler(X, Q, $) {
    let Y = X.handler;
    if ("createTask" in Y) {
      if (!$.taskStore) throw Error("No task store provided.");
      let J = { ...$, taskStore: $.taskStore };
      if (X.inputSchema) return await Promise.resolve(Y.createTask(Q, J));
      else return await Promise.resolve(Y.createTask(J));
    }
    if (X.inputSchema) return await Promise.resolve(Y(Q, $));
    else return await Promise.resolve(Y($));
  }
  async handleAutomaticTaskPolling(X, Q, $) {
    var Y;
    if (!$.taskStore)
      throw Error("No task store provided for task-capable tool.");
    let W = await this.validateToolInput(X, Q.params.arguments, Q.params.name),
      J = X.handler,
      G = { ...$, taskStore: $.taskStore },
      H = W
        ? await Promise.resolve(J.createTask(W, G))
        : await Promise.resolve(J.createTask(G)),
      B = H.task.taskId,
      z = H.task,
      K = (Y = z.pollInterval) !== null && Y !== void 0 ? Y : 5000;
    while (
      z.status !== "completed" &&
      z.status !== "failed" &&
      z.status !== "cancelled"
    ) {
      await new Promise((L) => setTimeout(L, K));
      let V = await $.taskStore.getTask(B);
      if (!V)
        throw new k(x.InternalError, `Task ${B} not found during polling`);
      z = V;
    }
    return await $.taskStore.getTaskResult(B);
  }
  setCompletionRequestHandler() {
    if (this._completionHandlerInitialized) return;
    this.server.assertCanSetRequestHandler(r1(L8)),
      this.server.registerCapabilities({ completions: {} }),
      this.server.setRequestHandler(L8, async (X) => {
        switch (X.params.ref.type) {
          case "ref/prompt":
            return A5(X), this.handlePromptCompletion(X, X.params.ref);
          case "ref/resource":
            return M5(X), this.handleResourceCompletion(X, X.params.ref);
          default:
            throw new k(
              x.InvalidParams,
              `Invalid completion reference: ${X.params.ref}`
            );
        }
      }),
      (this._completionHandlerInitialized = !0);
  }
  async handlePromptCompletion(X, Q) {
    let $ = this._registeredPrompts[Q.name];
    if (!$) throw new k(x.InvalidParams, `Prompt ${Q.name} not found`);
    if (!$.enabled) throw new k(x.InvalidParams, `Prompt ${Q.name} disabled`);
    if (!$.argsSchema) return H4;
    let Y = h1($.argsSchema),
      W = Y === null || Y === void 0 ? void 0 : Y[X.params.argument.name];
    if (!dz(W)) return H4;
    let J = iz(W);
    if (!J) return H4;
    let G = await J(X.params.argument.value, X.params.context);
    return rz(G);
  }
  async handleResourceCompletion(X, Q) {
    let $ = Object.values(this._registeredResourceTemplates).find(
      (J) => J.resourceTemplate.uriTemplate.toString() === Q.uri
    );
    if (!$) {
      if (this._registeredResources[Q.uri]) return H4;
      throw new k(
        x.InvalidParams,
        `Resource template ${X.params.ref.uri} not found`
      );
    }
    let Y = $.resourceTemplate.completeCallback(X.params.argument.name);
    if (!Y) return H4;
    let W = await Y(X.params.argument.value, X.params.context);
    return rz(W);
  }
  setResourceRequestHandlers() {
    if (this._resourceHandlersInitialized) return;
    this.server.assertCanSetRequestHandler(r1(J8)),
      this.server.assertCanSetRequestHandler(r1(G8)),
      this.server.assertCanSetRequestHandler(r1(H8)),
      this.server.registerCapabilities({ resources: { listChanged: !0 } }),
      this.server.setRequestHandler(J8, async (X, Q) => {
        let $ = Object.entries(this._registeredResources)
            .filter(([W, J]) => J.enabled)
            .map(([W, J]) => ({ uri: W, name: J.name, ...J.metadata })),
          Y = [];
        for (let W of Object.values(this._registeredResourceTemplates)) {
          if (!W.resourceTemplate.listCallback) continue;
          let J = await W.resourceTemplate.listCallback(Q);
          for (let G of J.resources) Y.push({ ...W.metadata, ...G });
        }
        return { resources: [...$, ...Y] };
      }),
      this.server.setRequestHandler(G8, async () => {
        return {
          resourceTemplates: Object.entries(
            this._registeredResourceTemplates
          ).map(([Q, $]) => ({
            name: Q,
            uriTemplate: $.resourceTemplate.uriTemplate.toString(),
            ...$.metadata,
          })),
        };
      }),
      this.server.setRequestHandler(H8, async (X, Q) => {
        let $ = new URL(X.params.uri),
          Y = this._registeredResources[$.toString()];
        if (Y) {
          if (!Y.enabled)
            throw new k(x.InvalidParams, `Resource ${$} disabled`);
          return Y.readCallback($, Q);
        }
        for (let W of Object.values(this._registeredResourceTemplates)) {
          let J = W.resourceTemplate.uriTemplate.match($.toString());
          if (J) return W.readCallback($, J, Q);
        }
        throw new k(x.InvalidParams, `Resource ${$} not found`);
      }),
      this.setCompletionRequestHandler(),
      (this._resourceHandlersInitialized = !0);
  }
  setPromptRequestHandlers() {
    if (this._promptHandlersInitialized) return;
    this.server.assertCanSetRequestHandler(r1(B8)),
      this.server.assertCanSetRequestHandler(r1(z8)),
      this.server.registerCapabilities({ prompts: { listChanged: !0 } }),
      this.server.setRequestHandler(B8, () => ({
        prompts: Object.entries(this._registeredPrompts)
          .filter(([, X]) => X.enabled)
          .map(([X, Q]) => {
            return {
              name: X,
              title: Q.title,
              description: Q.description,
              arguments: Q.argsSchema ? CI(Q.argsSchema) : void 0,
            };
          }),
      })),
      this.server.setRequestHandler(z8, async (X, Q) => {
        let $ = this._registeredPrompts[X.params.name];
        if (!$)
          throw new k(x.InvalidParams, `Prompt ${X.params.name} not found`);
        if (!$.enabled)
          throw new k(x.InvalidParams, `Prompt ${X.params.name} disabled`);
        if ($.argsSchema) {
          let Y = v6($.argsSchema),
            W = await m4(Y, X.params.arguments);
          if (!W.success) {
            let H = "error" in W ? W.error : "Unknown error",
              B = c4(H);
            throw new k(
              x.InvalidParams,
              `Invalid arguments for prompt ${X.params.name}: ${B}`
            );
          }
          let J = W.data,
            G = $.callback;
          return await Promise.resolve(G(J, Q));
        } else {
          let Y = $.callback;
          return await Promise.resolve(Y(Q));
        }
      }),
      this.setCompletionRequestHandler(),
      (this._promptHandlersInitialized = !0);
  }
  resource(X, Q, ...$) {
    let Y;
    if (typeof $[0] === "object") Y = $.shift();
    let W = $[0];
    if (typeof Q === "string") {
      if (this._registeredResources[Q])
        throw Error(`Resource ${Q} is already registered`);
      let J = this._createRegisteredResource(X, void 0, Q, Y, W);
      return (
        this.setResourceRequestHandlers(), this.sendResourceListChanged(), J
      );
    } else {
      if (this._registeredResourceTemplates[X])
        throw Error(`Resource template ${X} is already registered`);
      let J = this._createRegisteredResourceTemplate(X, void 0, Q, Y, W);
      return (
        this.setResourceRequestHandlers(), this.sendResourceListChanged(), J
      );
    }
  }
  registerResource(X, Q, $, Y) {
    if (typeof Q === "string") {
      if (this._registeredResources[Q])
        throw Error(`Resource ${Q} is already registered`);
      let W = this._createRegisteredResource(X, $.title, Q, $, Y);
      return (
        this.setResourceRequestHandlers(), this.sendResourceListChanged(), W
      );
    } else {
      if (this._registeredResourceTemplates[X])
        throw Error(`Resource template ${X} is already registered`);
      let W = this._createRegisteredResourceTemplate(X, $.title, Q, $, Y);
      return (
        this.setResourceRequestHandlers(), this.sendResourceListChanged(), W
      );
    }
  }
  _createRegisteredResource(X, Q, $, Y, W) {
    let J = {
      name: X,
      title: Q,
      metadata: Y,
      readCallback: W,
      enabled: !0,
      disable: () => J.update({ enabled: !1 }),
      enable: () => J.update({ enabled: !0 }),
      remove: () => J.update({ uri: null }),
      update: (G) => {
        if (typeof G.uri < "u" && G.uri !== $) {
          if ((delete this._registeredResources[$], G.uri))
            this._registeredResources[G.uri] = J;
        }
        if (typeof G.name < "u") J.name = G.name;
        if (typeof G.title < "u") J.title = G.title;
        if (typeof G.metadata < "u") J.metadata = G.metadata;
        if (typeof G.callback < "u") J.readCallback = G.callback;
        if (typeof G.enabled < "u") J.enabled = G.enabled;
        this.sendResourceListChanged();
      },
    };
    return (this._registeredResources[$] = J), J;
  }
  _createRegisteredResourceTemplate(X, Q, $, Y, W) {
    let J = {
      resourceTemplate: $,
      title: Q,
      metadata: Y,
      readCallback: W,
      enabled: !0,
      disable: () => J.update({ enabled: !1 }),
      enable: () => J.update({ enabled: !0 }),
      remove: () => J.update({ name: null }),
      update: (G) => {
        if (typeof G.name < "u" && G.name !== X) {
          if ((delete this._registeredResourceTemplates[X], G.name))
            this._registeredResourceTemplates[G.name] = J;
        }
        if (typeof G.title < "u") J.title = G.title;
        if (typeof G.template < "u") J.resourceTemplate = G.template;
        if (typeof G.metadata < "u") J.metadata = G.metadata;
        if (typeof G.callback < "u") J.readCallback = G.callback;
        if (typeof G.enabled < "u") J.enabled = G.enabled;
        this.sendResourceListChanged();
      },
    };
    return (this._registeredResourceTemplates[X] = J), J;
  }
  _createRegisteredPrompt(X, Q, $, Y, W) {
    let J = {
      title: Q,
      description: $,
      argsSchema: Y === void 0 ? void 0 : k6(Y),
      callback: W,
      enabled: !0,
      disable: () => J.update({ enabled: !1 }),
      enable: () => J.update({ enabled: !0 }),
      remove: () => J.update({ name: null }),
      update: (G) => {
        if (typeof G.name < "u" && G.name !== X) {
          if ((delete this._registeredPrompts[X], G.name))
            this._registeredPrompts[G.name] = J;
        }
        if (typeof G.title < "u") J.title = G.title;
        if (typeof G.description < "u") J.description = G.description;
        if (typeof G.argsSchema < "u") J.argsSchema = k6(G.argsSchema);
        if (typeof G.callback < "u") J.callback = G.callback;
        if (typeof G.enabled < "u") J.enabled = G.enabled;
        this.sendPromptListChanged();
      },
    };
    return (this._registeredPrompts[X] = J), J;
  }
  _createRegisteredTool(X, Q, $, Y, W, J, G, H, B) {
    $7(X);
    let z = {
      title: Q,
      description: $,
      inputSchema: nz(Y),
      outputSchema: nz(W),
      annotations: J,
      execution: G,
      _meta: H,
      handler: B,
      enabled: !0,
      disable: () => z.update({ enabled: !1 }),
      enable: () => z.update({ enabled: !0 }),
      remove: () => z.update({ name: null }),
      update: (K) => {
        if (typeof K.name < "u" && K.name !== X) {
          if (typeof K.name === "string") $7(K.name);
          if ((delete this._registeredTools[X], K.name))
            this._registeredTools[K.name] = z;
        }
        if (typeof K.title < "u") z.title = K.title;
        if (typeof K.description < "u") z.description = K.description;
        if (typeof K.paramsSchema < "u") z.inputSchema = k6(K.paramsSchema);
        if (typeof K.callback < "u") z.handler = K.callback;
        if (typeof K.annotations < "u") z.annotations = K.annotations;
        if (typeof K._meta < "u") z._meta = K._meta;
        if (typeof K.enabled < "u") z.enabled = K.enabled;
        this.sendToolListChanged();
      },
    };
    return (
      (this._registeredTools[X] = z),
      this.setToolRequestHandlers(),
      this.sendToolListChanged(),
      z
    );
  }
  tool(X, ...Q) {
    if (this._registeredTools[X])
      throw Error(`Tool ${X} is already registered`);
    let $, Y, W, J;
    if (typeof Q[0] === "string") $ = Q.shift();
    if (Q.length > 1) {
      let H = Q[0];
      if (W7(H)) {
        if (
          ((Y = Q.shift()),
          Q.length > 1 &&
            typeof Q[0] === "object" &&
            Q[0] !== null &&
            !W7(Q[0]))
        )
          J = Q.shift();
      } else if (typeof H === "object" && H !== null) J = Q.shift();
    }
    let G = Q[0];
    return this._createRegisteredTool(
      X,
      void 0,
      $,
      Y,
      W,
      J,
      { taskSupport: "forbidden" },
      void 0,
      G
    );
  }
  registerTool(X, Q, $) {
    if (this._registeredTools[X])
      throw Error(`Tool ${X} is already registered`);
    let {
      title: Y,
      description: W,
      inputSchema: J,
      outputSchema: G,
      annotations: H,
      _meta: B,
    } = Q;
    return this._createRegisteredTool(
      X,
      Y,
      W,
      J,
      G,
      H,
      { taskSupport: "forbidden" },
      B,
      $
    );
  }
  prompt(X, ...Q) {
    if (this._registeredPrompts[X])
      throw Error(`Prompt ${X} is already registered`);
    let $;
    if (typeof Q[0] === "string") $ = Q.shift();
    let Y;
    if (Q.length > 1) Y = Q.shift();
    let W = Q[0],
      J = this._createRegisteredPrompt(X, void 0, $, Y, W);
    return this.setPromptRequestHandlers(), this.sendPromptListChanged(), J;
  }
  registerPrompt(X, Q, $) {
    if (this._registeredPrompts[X])
      throw Error(`Prompt ${X} is already registered`);
    let { title: Y, description: W, argsSchema: J } = Q,
      G = this._createRegisteredPrompt(X, Y, W, J, $);
    return this.setPromptRequestHandlers(), this.sendPromptListChanged(), G;
  }
  isConnected() {
    return this.server.transport !== void 0;
  }
  async sendLoggingMessage(X, Q) {
    return this.server.sendLoggingMessage(X, Q);
  }
  sendResourceListChanged() {
    if (this.isConnected()) this.server.sendResourceListChanged();
  }
  sendToolListChanged() {
    if (this.isConnected()) this.server.sendToolListChanged();
  }
  sendPromptListChanged() {
    if (this.isConnected()) this.server.sendPromptListChanged();
  }
}
var SI = { type: "object", properties: {} };
function oz(X) {
  return (
    X !== null &&
    typeof X === "object" &&
    "parse" in X &&
    typeof X.parse === "function" &&
    "safeParse" in X &&
    typeof X.safeParse === "function"
  );
}
function ZI(X) {
  return "_def" in X || "_zod" in X || oz(X);
}
function W7(X) {
  if (typeof X !== "object" || X === null) return !1;
  if (ZI(X)) return !1;
  if (Object.keys(X).length === 0) return !0;
  return Object.values(X).some(oz);
}
function nz(X) {
  if (!X) return;
  if (W7(X)) return k6(X);
  return X;
}
function CI(X) {
  let Q = h1(X);
  if (!Q) return [];
  return Object.entries(Q).map(([$, Y]) => {
    let W = _J(Y),
      J = xJ(Y);
    return { name: $, description: W, required: !J };
  });
}
function r1(X) {
  let Q = h1(X),
    $ = Q === null || Q === void 0 ? void 0 : Q.method;
  if (!$) throw Error("Schema is missing a method literal");
  let Y = p4($);
  if (typeof Y === "string") return Y;
  throw Error("Schema method literal must be a string");
}
function rz(X) {
  return {
    completion: {
      values: X.slice(0, 100),
      total: X.length,
      hasMore: X.length > 100,
    },
  };
}
var H4 = { completion: { values: [], hasMore: !1 } };
function kI(X, Q, $, Y, W) {
  return {
    name: X,
    description: Q,
    inputSchema: $,
    handler: Y,
    annotations: W?.annotations,
  };
}
function vI(X) {
  let Q = new J7(
    { name: X.name, version: X.version ?? "1.0.0" },
    { capabilities: { tools: X.tools ? {} : void 0 } }
  );
  if (X.tools)
    X.tools.forEach(($) => {
      Q.registerTool(
        $.name,
        {
          description: $.description,
          inputSchema: $.inputSchema,
          annotations: $.annotations,
        },
        $.handler
      );
    });
  return { type: "sdk", name: X.name, instance: Q };
}
function s_({ prompt: X, options: Q }) {
  let { systemPrompt: $, settingSources: Y, sandbox: W, ...J } = Q ?? {},
    G,
    H;
  if ($ === void 0) G = "";
  else if (typeof $ === "string") G = $;
  else if ($.type === "preset") H = $.append;
  let B = J.pathToClaudeCodeExecutable;
  if (!B) {
    let L6 = TI(import.meta.url),
      q6 = tz(L6, "..");
    B = tz(q6, "cli.js");
  }
  process.env.CLAUDE_AGENT_SDK_VERSION = "0.2.34";
  let {
      abortController: z = F6(),
      additionalDirectories: K = [],
      agent: V,
      agents: L,
      allowedTools: U = [],
      betas: F,
      canUseTool: q,
      continue: N,
      cwd: w,
      debug: M,
      debugFile: R,
      disallowedTools: S = [],
      tools: C,
      env: K0,
      executable: U0 = M6() ? "bun" : "node",
      executableArgs: s = [],
      extraArgs: D0 = {},
      fallbackModel: q0,
      enableFileCheckpointing: L1,
      forkSession: P1,
      hooks: o1,
      includePartialMessages: c,
      persistSession: Q9,
      maxThinkingTokens: r6,
      maxTurns: o6,
      maxBudgetUsd: t6,
      mcpServers: a6,
      model: B4,
      outputFormat: E0,
      permissionMode: S1 = "default",
      allowDangerouslySkipPermissions: s6 = !1,
      permissionPromptToolName: az,
      plugins: sz,
      resume: ez,
      resumeSessionAt: XK,
      sessionId: QK,
      stderr: $K,
      strictMcpConfig: YK,
    } = J,
    G7 = E0?.type === "json_schema" ? E0.schema : void 0,
    V6 = K0;
  if (!V6) V6 = { ...process.env };
  if (!V6.CLAUDE_CODE_ENTRYPOINT) V6.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  if (L1) V6.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = "true";
  if (!B) throw Error("pathToClaudeCodeExecutable is required");
  let $9 = {},
    H7 = new Map();
  if (a6)
    for (let [L6, q6] of Object.entries(a6))
      if (q6.type === "sdk" && "instance" in q6)
        H7.set(L6, q6.instance), ($9[L6] = { type: "sdk", name: L6 });
      else $9[L6] = q6;
  let WK = typeof X === "string",
    B7 = new XX({
      abortController: z,
      additionalDirectories: K,
      agent: V,
      betas: F,
      cwd: w,
      debug: M,
      debugFile: R,
      executable: U0,
      executableArgs: s,
      extraArgs: D0,
      pathToClaudeCodeExecutable: B,
      env: V6,
      forkSession: P1,
      stderr: $K,
      maxThinkingTokens: r6,
      maxTurns: o6,
      maxBudgetUsd: t6,
      model: B4,
      fallbackModel: q0,
      jsonSchema: G7,
      permissionMode: S1,
      allowDangerouslySkipPermissions: s6,
      permissionPromptToolName: az,
      continueConversation: N,
      resume: ez,
      resumeSessionAt: XK,
      sessionId: QK,
      settingSources: Y ?? [],
      allowedTools: U,
      disallowedTools: S,
      tools: C,
      mcpServers: $9,
      strictMcpConfig: YK,
      canUseTool: !!q,
      hooks: !!o1,
      includePartialMessages: c,
      persistSession: Q9,
      plugins: sz,
      sandbox: W,
      spawnClaudeCodeProcess: J.spawnClaudeCodeProcess,
    }),
    z7 = new $X(B7, WK, q, o1, z, H7, G7, {
      systemPrompt: G,
      appendSystemPrompt: H,
      agents: L,
    });
  if (typeof X === "string")
    B7.write(
      Z0({
        type: "user",
        session_id: "",
        message: { role: "user", content: [{ type: "text", text: X }] },
        parent_tool_use_id: null,
      }) +
        `
`
    );
  else z7.streamInput(X);
  return z7;
}
function e_(X) {
  return V9(X);
}
function Xx(X, Q) {
  return UW(X, Q);
}
async function Qx(X, Q) {
  let Y = [];
  try {
    const $ = V7(Y, V9(Q), 1);
    await $.send(X);
    for await (let B of $.stream()) if (B.type === "result") return B;
    throw Error("Session ended without result message");
  } catch (W) {
    var J = W,
      G = 1;
  } finally {
    var H = L7(Y, J, G);
    H && (await H);
  }
}
export {
  Xx as unstable_v2_resumeSession,
  Qx as unstable_v2_prompt,
  e_ as unstable_v2_createSession,
  kI as tool,
  s_ as query,
  vI as createSdkMcpServer,
  nU as HOOK_EVENTS,
  rU as EXIT_REASONS,
  F1 as AbortError,
};
