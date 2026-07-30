"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EXECUTION_SETTINGS = void 0;
exports.evaluateGroup = evaluateGroup;
exports.evaluateRule = evaluateRule;
exports.outcomeRank = outcomeRank;
exports.runRulesForCase = runRulesForCase;
exports.runSimulation = runSimulation;
exports.resolveActionValue = resolveActionValue;
exports.resolveBracketValue = resolveBracketValue;
exports.applyAction = applyAction;
exports.validatePayload = validatePayload;
exports.applyTranslationMapping = applyTranslationMapping;
var fields_1 = require("./fields");
var expression_1 = require("./expression");
var condition_tree_1 = require("./condition-tree");
exports.DEFAULT_EXECUTION_SETTINGS = { conflictResolution: "execute-all" };
// Promotion order — a rule "reaches" Prod by first passing through Dev and
// UAT, so anything already at Prod is also valid to see in a Dev or UAT
// simulation; a Dev-only rule is invisible once you simulate at a higher tier.
// FUTURE: ENV_RANK and isPromotedTo are removed for the demo.
// Restore when environment promotion (Dev → UAT → Prod) is reintroduced.
// const ENV_RANK: Record<RuleEnvironment, number> = { Dev: 0, UAT: 1, Prod: 2 };
// function isPromotedTo(ruleEnv: RuleEnvironment, simulationTier: RuleEnvironment): boolean {
//   return ENV_RANK[ruleEnv] >= ENV_RANK[simulationTier];
// }
function coerceNumber(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
}
// Ordering-comparison coercion — an ISO-date-shaped string (e.g. from a
// FieldDataType "date" field) is compared as a timestamp instead of falling
// through to coerceNumber, which would truncate "2026-03-01" to just 2026
// and compare wrong for two dates in the same year.
function coerceComparable(v) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
        var t = Date.parse(v);
        if (!Number.isNaN(t))
            return t;
    }
    return coerceNumber(v);
}
function evaluateOperator(operator, actual, expected, expected2) {
    if (actual === undefined)
        return false;
    switch (operator) {
        case "=":
            return String(actual).toLowerCase() === String(expected).toLowerCase();
        case "!=":
            return String(actual).toLowerCase() !== String(expected).toLowerCase();
        case ">":
            return coerceComparable(actual) > coerceComparable(expected);
        case "<":
            return coerceComparable(actual) < coerceComparable(expected);
        case ">=":
            return coerceComparable(actual) >= coerceComparable(expected);
        case "<=":
            return coerceComparable(actual) <= coerceComparable(expected);
        case "contains":
            return String(actual).toLowerCase().includes(String(expected).toLowerCase());
        case "starts_with":
            return String(actual).toLowerCase().startsWith(String(expected).toLowerCase());
        case "in":
            return expected
                .split(",")
                .map(function (s) { return s.trim().toLowerCase(); })
                .includes(String(actual).toLowerCase());
        case "between": {
            var n = coerceComparable(actual);
            return n >= coerceComparable(expected) && n <= coerceComparable(expected2 !== null && expected2 !== void 0 ? expected2 : expected);
        }
        default:
            return false;
    }
}
// Each child joins the accumulated result of its earlier siblings via its own
// `effectiveConnector` (per-child AND/OR/N.A, falling back to the group's
// legacy `logic` when unset) — a strict left-to-right fold, no AND-before-OR
// precedence. N.A. children are still evaluated (so their trace/preview
// details are accurate) but excluded from the fold entirely. When every
// child in a group shares one connector (every rule saved before per-child
// connectors existed), this reduces to exactly the old every()/some() result.
function evaluateGroup(group, input, details, catalog) {
    if (catalog === void 0) { catalog = []; }
    if (group.children.length === 0)
        return true;
    var acc = null;
    group.children.forEach(function (child, i) {
        var value = child.type === "condition"
            ? evaluateConditionLeaf(child, input, details, catalog)
            : evaluateGroup(child, input, details, catalog);
        var connector = (0, condition_tree_1.effectiveConnector)(group, i);
        if (connector === "N.A.")
            return;
        acc = acc === null ? value : connector === "OR" ? acc || value : acc && value;
    });
    return acc !== null && acc !== void 0 ? acc : true;
}
function evaluateConditionLeaf(cond, input, details, catalog) {
    var _a;
    var raw = input[cond.field];
    // A plain Condition should only ever point at a scalar field — the UI
    // filters field pickers by type — but stay defensive rather than crash if
    // one somehow references a list field.
    var actual = Array.isArray(raw) ? undefined : raw;
    var passed = evaluateOperator(cond.operator, actual, cond.value, cond.value2);
    var field = (0, fields_1.getField)(catalog, cond.field);
    var expectedLabel = cond.operator === "between"
        ? "".concat(cond.value, " \u2013 ").concat(cond.value2)
        : cond.value;
    details.push({
        field: (_a = field === null || field === void 0 ? void 0 : field.label) !== null && _a !== void 0 ? _a : cond.field,
        operator: cond.operator,
        expected: expectedLabel,
        actual: actual === undefined ? "—" : String(actual),
        passed: passed,
    });
    return passed;
}
function evaluateRule(rule, input, catalog, opts) {
    var _a;
    if (catalog === void 0) { catalog = []; }
    if (opts === void 0) { opts = {}; }
    var start = performance.now();
    var details = [];
    if (rule.status !== "Published" && !opts.forceEvaluate) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
            status: "Skipped",
            conditionSummaries: [],
            actionsApplied: [],
            durationMs: 0,
        };
    }
    // A rule's whole condition tree is one unified AND/OR boolean expression —
    // same as a SQL WHERE clause — evaluated in a single pass. (Previously an
    // IF/WHERE split evaluated a subset of top-level conditions as a separate
    // "scope gate" first; that only ever inspected direct children of the root
    // group — nested groups were silently exempt — and it evaluated WHERE and
    // IF as two independent gates ANDed together regardless of the group's own
    // AND/OR toggle, so selecting OR at the top didn't actually mean OR once a
    // condition was tagged WHERE. No seed or template rule used it. Removed.)
    var passed = evaluateGroup(rule.rootGroup, input, details, catalog);
    var durationMs = Math.max(0.1, performance.now() - start);
    var hasElse = !!((_a = rule.elseActions) === null || _a === void 0 ? void 0 : _a.length);
    return {
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        status: passed ? "Passed" : "Failed",
        conditionSummaries: details.map(function (d) { return ({
            field: d.field,
            operator: d.operator,
            expected: d.expected,
            actual: d.actual,
            passed: d.passed,
        }); }),
        actionsApplied: passed ? rule.actions : hasElse ? rule.elseActions : [],
        branch: passed ? "then" : hasElse ? "else" : undefined,
        durationMs: durationMs,
        sandbox: rule.status !== "Published" && opts.forceEvaluate ? true : undefined,
    };
}
function outcomeRank(outcome) {
    if (outcome === "Rejected")
        return 2;
    if (outcome === "Review Required")
        return 1;
    return 0;
}
// Shared evaluation core — walks an already-filtered-and-ordered rule list
// applying conflict-resolution + sandbox semantics. Used by runSimulation
// (industry-wide) below and by product-rule-engine.ts's executeRulesByProduct
// (product-mapped subset), so both flows share one source of truth for how a
// case is decided rather than two divergent implementations.
//
// `chainInputs` (default false — runSimulation's call site never passes it,
// so its behavior is byte-for-byte unchanged) makes each rule's Assign
// Value/Calculate outputs visible to every later rule in this same call —
// product-rule-engine.ts's executeRulesByProduct is the only caller that
// opts in, since chaining is scoped to a product's sequenced rule list.
function runRulesForCase(rules, input, catalog, sandboxRuleIds, executionSettings, chainInputs) {
    var _a, _b, _c, _d, _e, _f;
    if (catalog === void 0) { catalog = []; }
    if (sandboxRuleIds === void 0) { sandboxRuleIds = []; }
    if (executionSettings === void 0) { executionSettings = exports.DEFAULT_EXECUTION_SETTINGS; }
    if (chainInputs === void 0) { chainInputs = false; }
    var trace = [];
    var outcome = "Approved";
    var reasonCode = "ELIGIBLE_CUSTOMER";
    var summary = "All applicable rules passed. Application meets policy criteria.";
    var calculatedValues = {};
    var triggeredRules = [];
    var decidingRuleId = null;
    var halted = false;
    var workingInput = input;
    for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
        var rule = rules_1[_i];
        if (halted) {
            trace.push({
                ruleId: rule.id,
                ruleName: rule.name,
                priority: rule.priority,
                status: "Skipped",
                conditionSummaries: [],
                actionsApplied: [],
                durationMs: 0,
            });
            continue;
        }
        // A sandboxed rule under test bypasses both the status gate and the
        // environment gate — the whole point is previewing it regardless of
        // where it's been promoted to. Otherwise a rule only fires once it's
        // Active AND has reached this simulation's environment tier.
        var sandboxed = sandboxRuleIds.includes(rule.id);
        // FUTURE: restore environment gate: sandboxed || (rule.status === "Published" && isPromotedTo(rule.environment, environment))
        var eligible = sandboxed || rule.status === "Published";
        if (!eligible) {
            trace.push({
                ruleId: rule.id,
                ruleName: rule.name,
                priority: rule.priority,
                status: "Not Applicable",
                conditionSummaries: [],
                actionsApplied: [],
                durationMs: 0,
            });
            continue;
        }
        var step = evaluateRule(rule, workingInput, catalog, { forceEvaluate: sandboxed });
        trace.push(step);
        // A rule "fires" if either its THEN or ELSE branch actually ran —
        // step.actionsApplied already holds whichever one applies (see
        // evaluateRule), so this uniformly covers both without branching on status.
        if (step.actionsApplied.length > 0) {
            triggeredRules.push(rule.id);
            var producedValues = {};
            for (var _g = 0, _h = step.actionsApplied; _g < _h.length; _g++) {
                var action = _h[_g];
                // Calculate's {{field}} expressions resolve against the case's
                // current field values plus every value computed so far in this run
                // (this rule's earlier actions and, when chainInputs is on, earlier
                // rules' outputs already folded into workingInput above).
                var context = __assign(__assign({}, workingInput), calculatedValues);
                applyAction(action, calculatedValues, context);
                applyAction(action, producedValues, context);
                if (action.type === "Reject") {
                    // Reject always wins and halts further evaluation.
                    outcome = "Rejected";
                    reasonCode = (_a = action.reasonCode) !== null && _a !== void 0 ? _a : "POLICY_BREACH";
                    summary = (_b = action.message) !== null && _b !== void 0 ? _b : "".concat(rule.name, " triggered a rejection.");
                    decidingRuleId = rule.id;
                    halted = true;
                }
                else if (action.type === "Approve" && outcomeRank(outcome) === 0) {
                    // A later baseline Approve must never downgrade an earlier Review flag.
                    outcome = "Approved";
                    reasonCode = (_c = action.reasonCode) !== null && _c !== void 0 ? _c : "ELIGIBLE_CUSTOMER";
                    summary = (_d = action.message) !== null && _d !== void 0 ? _d : "".concat(rule.name, " confirmed approval eligibility.");
                    decidingRuleId = rule.id;
                }
                else if (action.type === "Flag for Review") {
                    if (outcomeRank(outcome) <= 1) {
                        outcome = "Review Required";
                        reasonCode = (_e = action.reasonCode) !== null && _e !== void 0 ? _e : "MANUAL_REVIEW";
                        summary = (_f = action.message) !== null && _f !== void 0 ? _f : "".concat(rule.name, " flagged this case for manual review.");
                        decidingRuleId = rule.id;
                    }
                }
            }
            // "first-match" stops evaluation at the first rule whose IF/ELSE
            // actually fired — the declarative equivalent of a switch/case's break.
            if (executionSettings.conflictResolution === "first-match") {
                halted = true;
            }
            if (Object.keys(producedValues).length > 0) {
                step.producedValues = producedValues;
                if (chainInputs)
                    workingInput = __assign(__assign({}, workingInput), producedValues);
            }
        }
    }
    return { outcome: outcome, reasonCode: reasonCode, summary: summary, calculatedValues: calculatedValues, triggeredRules: triggeredRules, decidingRuleId: decidingRuleId, trace: trace };
}
function runSimulation(domain, rules, input, catalog, sandboxRuleIds, executionSettings) {
    if (catalog === void 0) { catalog = []; }
    if (sandboxRuleIds === void 0) { sandboxRuleIds = []; }
    if (executionSettings === void 0) { executionSettings = exports.DEFAULT_EXECUTION_SETTINGS; }
    var start = performance.now();
    var sortDirection = executionSettings.conflictResolution === "lowest-priority" ? -1 : 1;
    var domainRules = rules
        .filter(function (r) { return r.domain === domain && r.simulatable; })
        .sort(function (a, b) { return sortDirection * (a.priority - b.priority); });
    var core = runRulesForCase(domainRules, input, catalog, sandboxRuleIds, executionSettings);
    var totalDurationMs = Math.max(1, performance.now() - start);
    var sandbox = core.trace.some(function (t) { return t.sandbox; });
    return __assign(__assign({ id: "SIM-".concat(Date.now()), domain: domain }, core), { input: input, timestamp: new Date().toISOString(), totalDurationMs: totalDurationMs, sandbox: sandbox || undefined });
}
// What a Calculate/Assign Value action would set its Output Field to, given
// a resolution context (case fields + values computed so far). Calculate
// treats outputValue as a `{{field}} * 1.05`-style expression (see
// src/lib/expression.ts); Assign Value stays a literal (numeric-coerced only
// when the whole string is a bare number, same as before expressions existed).
function resolveActionValue(action, context) {
    var _a;
    var raw = (_a = action.outputValue) !== null && _a !== void 0 ? _a : "";
    if (action.type === "Calculate")
        return (0, expression_1.evaluateExpression)(raw, context);
    var value = raw;
    var numeric = coerceNumber(raw);
    if (!Number.isNaN(numeric) && /^[0-9.\-]+$/.test(raw.trim())) {
        value = numeric;
    }
    return { value: value };
}
// What a "Bracket Lookup" action would set its Output Field to — resolves one
// of several range-based outputs (e.g. credit score bracket → interest rate),
// the branching Calculate's arithmetic-only expression language deliberately
// can't do (no eval, see expression.ts). Returns an empty-value result when
// the bracket field is missing/non-numeric or no bracket matches.
function resolveBracketValue(action, context) {
    var _a;
    if (!action.bracketField || !((_a = action.brackets) === null || _a === void 0 ? void 0 : _a.length))
        return { value: "" };
    var raw = context[action.bracketField];
    var n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isNaN(n))
        return { value: "", error: "Unknown or non-numeric field \"".concat(action.bracketField, "\"") };
    var match = action.brackets.find(function (b) { return n >= b.min && n <= b.max; });
    if (!match)
        return { value: "", error: "No bracket matched ".concat(action.bracketField, "=").concat(n) };
    var numeric = coerceNumber(match.outputValue);
    var value = !Number.isNaN(numeric) && /^[0-9.\-]+$/.test(match.outputValue.trim()) ? numeric : match.outputValue;
    return { value: value };
}
function applyAction(action, calculatedValues, context) {
    if (context === void 0) { context = calculatedValues; }
    if (action.type === "Calculate" || action.type === "Assign Value") {
        if (action.outputField && action.outputValue !== undefined) {
            calculatedValues[action.outputField] = resolveActionValue(action, context).value;
        }
    }
    else if (action.type === "Bracket Lookup") {
        if (action.outputField) {
            var resolved = resolveBracketValue(action, context);
            if (!resolved.error && resolved.value !== "")
                calculatedValues[action.outputField] = resolved.value;
        }
    }
}
// runRuleSetExecution removed — Execution Manager deleted.
// RuleSetStepResult, RuleSetExecutionResult interfaces also removed.
// FUTURE: restore if multi-step Rule Set orchestration is reintroduced.
function validatePayload(input, catalog) {
    var errors = [];
    for (var _i = 0, _a = Object.entries(input); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        var field = (0, fields_1.getField)(catalog, key);
        if (!field)
            continue;
        // Arrays not fully supported by scalar validators yet, skip them
        if (Array.isArray(value))
            continue;
        if (field.type === "number" || field.type === "currency") {
            var num = coerceNumber(value);
            if (!Number.isNaN(num)) {
                if (field.minValue !== undefined && num < field.minValue) {
                    errors.push({ field: field.label, error: "".concat(field.label, " cannot be less than ").concat(field.minValue) });
                }
                if (field.maxValue !== undefined && num > field.maxValue) {
                    errors.push({ field: field.label, error: "".concat(field.label, " cannot be greater than ").concat(field.maxValue) });
                }
            }
        }
        else if (field.type === "string") {
            var str = String(value);
            if (field.minLength !== undefined && str.length < field.minLength) {
                errors.push({ field: field.label, error: "".concat(field.label, " must be at least ").concat(field.minLength, " characters") });
            }
            if (field.maxLength !== undefined && str.length > field.maxLength) {
                errors.push({ field: field.label, error: "".concat(field.label, " cannot exceed ").concat(field.maxLength, " characters") });
            }
            if (field.regexPattern) {
                try {
                    var regex = new RegExp(field.regexPattern);
                    if (!regex.test(str)) {
                        errors.push({ field: field.label, error: "".concat(field.label, " format is invalid") });
                    }
                }
                catch (e) {
                    // Ignore invalid regex patterns authored by user
                }
            }
        }
    }
    return errors;
}
function applyTranslationMapping(payload, mapping) {
    if (!mapping || !mapping.entries.length)
        return payload;
    var output = __assign({}, payload);
    for (var _i = 0, _a = mapping.entries; _i < _a.length; _i++) {
        var entry = _a[_i];
        if (entry.status !== "Mapped" || !entry.mappedField)
            continue;
        var extKey = entry.externalAttribute;
        var intKey = entry.mappedField;
        if (extKey in output) {
            var val = output[extKey];
            // Translate Value if map exists
            if (entry.valueMap && val !== null && val !== undefined && !Array.isArray(val)) {
                var strVal = String(val);
                if (entry.valueMap[strVal] !== undefined) {
                    // If the translated value is purely numeric, cast it
                    var translated = entry.valueMap[strVal];
                    var num = Number(translated);
                    val = !Number.isNaN(num) && String(num) === translated ? num : translated;
                }
            }
            // Translate Key
            if (extKey !== intKey) {
                output[intKey] = val;
                delete output[extKey];
            }
            else {
                output[intKey] = val;
            }
        }
    }
    return output;
}
