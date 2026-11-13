/* 同一版的快照。请求序号遇到 A→B→A 也会往前走，旧回调对不上就丢掉。
   不读模型，也不发请求。 */
var LingcunEpoch = (function () {
  function deps(p) {
    var v = (p && p.v18) || {};
    var rec = v.record || {};
    var d = v.direction || {};
    return {
      projectId: p && p.id,
      seq: v.epochSeq || 0,
      boot: v.boot || 0,
      inputRev: rec.inputRev || 0,
      idea: String(p && p.idea || ""),
      direction: (d.id || "") + "\n" + (d.custom || ""),
      take: (v.take || []).join("\n"),
      leave: (v.leave || []).join("\n"),
      clarify: v.clarifyRev || 0,
      edit: v.editRev || 0
    };
  }
  function keyOf(d) {
    return [d.inputRev, d.idea, d.direction, d.take, d.leave, d.clarify, d.edit].join("\u0001");
  }
  function editKey(d) {
    return [d.inputRev, d.idea, d.direction, d.take, d.leave, d.clarify].join("\u0001");
  }
  function note(p, bound, reason) {
    var v = p.v18;
    v.late = v.late || [];
    v.late.push({ reqId: bound && bound.reqId, slot: bound && bound.slot, seq: bound && bound.seq, at: v.epochSeq || 0, reason: reason });
    return v.late[v.late.length - 1];
  }
  function invalidate(p, prev, now) {
    var v = p.v18;
    var onlyEdit = editKey(prev) === editKey(now) && prev.edit !== now.edit;
    var onlyClarify = prev.idea === now.idea && prev.direction === now.direction && prev.take === now.take && prev.leave === now.leave && prev.edit === now.edit && prev.clarify !== now.clarify;
    if (!onlyEdit && !onlyClarify && v.edited && v.attempt) {
      v.handDraft = { text: v.attempt, editRev: v.editRev || 0, seq: v.epochSeq || 0, stale: true, note: "这句是按上一版写的，要重新确认后才能当作现在的做法" };
      v.edited = false;
    }
    v.epochSeq = (v.epochSeq || 0) + 1;
    v.epochWhy = onlyEdit ? "edit" : (onlyClarify ? "clarify" : "deps");
    v.aiAttempts = null;
    if (onlyClarify) v.packEpoch = -1;
    else { v.candidatePack = []; v.packEpoch = -1; }
    if (!v.edited) v.attemptFrom = "manual";
    return v.epochSeq;
  }
  function sync(p) {
    if (!p || !p.v18) return false;
    var v = p.v18;
    var now = deps(p);
    if (!v.epochKey) {
      v.epochKey = keyOf(now);
      v.epochSeq = v.epochSeq || 0;
      return false;
    }
    if (v.epochKey === keyOf(now)) return false;
    var prev = {
      inputRev: 0, idea: "", direction: "", take: "", leave: "", clarify: 0, edit: 0
    };
    var parts = v.epochKey.split("\u0001");
    prev.inputRev = Number(parts[0]); prev.idea = parts[1]; prev.direction = parts[2]; prev.take = parts[3]; prev.leave = parts[4]; prev.clarify = Number(parts[5]); prev.edit = Number(parts[6]);
    invalidate(p, prev, now);
    v.epochKey = keyOf(deps(p));
    return true;
  }
  function issue(p, slot) {
    var v = p.v18;
    v.flight = v.flight || {};
    var reqId = (v.reqN || 0) + 1;
    v.reqN = reqId;
    var bound = { projectId: p.id, slot: slot, reqId: reqId, seq: v.epochSeq || 0, boot: v.boot || 0, stamp: v.attemptStamp || 0, deps: deps(p) };
    v.flight[slot] = { reqId: reqId, status: "pending", seq: bound.seq };
    v.lastBound = bound;
    return bound;
  }
  function accept(p, bound) {
    if (!p || !p.v18 || !bound) return { ok: false, reason: "missing" };
    if (p.id !== bound.projectId) return { ok: false, reason: "other-project" };
    var v = p.v18;
    if ((v.boot || 0) !== (bound.boot || 0)) return { ok: false, reason: "reloaded" };
    if ((v.epochSeq || 0) !== bound.seq) return { ok: false, reason: "stale-seq" };
    var now = deps(p);
    var keys = ["inputRev", "idea", "direction", "take", "leave", "clarify", "edit"];
    for (var i = 0; i < keys.length; i++) if (now[keys[i]] !== bound.deps[keys[i]]) return { ok: false, reason: "stale-" + keys[i] };
    var flight = v.flight && v.flight[bound.slot];
    if (flight && flight.reqId !== bound.reqId) return { ok: false, reason: "older-request" };
    if (bound.slot !== "understand" && (v.appliedReq || 0) > bound.reqId) return { ok: false, reason: "superseded" };
    if (v.edited && bound.slot !== "user") return { ok: false, reason: "hand-edit" };
    return { ok: true };
  }
  function finish(p, bound) {
    var flight = p.v18.flight && p.v18.flight[bound.slot];
    if (!flight || flight.reqId !== bound.reqId) return false;
    flight.status = "done";
    return true;
  }
  function pendingNow(p) {
    var v = p && p.v18, f = v && v.flight || {}, s;
    var block = { attempts: 1, v18_attempt: 1, bg: 1 };
    for (s in f) if (block[s] && f[s] && f[s].status === "pending" && f[s].seq === (v.epochSeq || 0)) return s;
    return "";
  }
  function canSave(p) {
    var v = p.v18;
    var slot = pendingNow(p);
    if (slot) return { ok: false, reason: "还在等这一版，没有把旧动作存成新版本" };
    if (v.handDraft && v.handDraft.stale && v.attempt === v.handDraft.text) return { ok: false, reason: "这是失效草稿，不能当成现在的做法" };
    return { ok: true };
  }
  function wrote(p, reqId) {
    if (!p || !p.v18) return;
    var n = reqId || (p.v18.reqN || 0);
    p.v18.appliedReq = Math.max(p.v18.appliedReq || 0, n);
  }
  function freeze(p) {
    var v = p.v18;
    var snap = {
      epochSeq: v.epochSeq || 0,
      attempt: v.attempt || "",
      title: v.title || p.title || "",
      idea: String(p.idea || ""),
      direction: (v.direction && (v.direction.custom || v.direction.label || v.direction.id)) || "",
      take: (v.take || []).slice(),
      leave: (v.leave || []).slice(),
      inputRev: v.record && v.record.inputRev || 0,
      premise: v.premise ? { verdict: v.premise.verdict, verified: !!v.premise.verified, inputRev: v.premise.inputRev, question: v.premise.question || "" } : null
    };
    p.savedSnaps = p.savedSnaps || [];
    if (p.frozen) p.savedSnaps.push(p.frozen);
    p.frozen = snap;
    return snap;
  }
  function boot(projects) {
    (projects || []).forEach(function (p) {
      if (!p || !p.v18) return;
      p.v18.boot = (p.v18.boot || 0) + 1;
      var f = p.v18.flight || {}, s;
      for (s in f) if (f[s] && f[s].status === "pending") f[s].status = "dropped";
    });
  }
  return { deps: deps, sync: sync, issue: issue, accept: accept, finish: finish, note: note, pendingNow: pendingNow, canSave: canSave, wrote: wrote, freeze: freeze, boot: boot };
})();
var LingcunTransport = { handler: null, waitMs: 0 };
