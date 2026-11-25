(function () {
  var THEMES = {
    'Fluent Next': [['fluent-next.blue.light', 'blue light', false], ['fluent-next.blue.dark', 'blue dark', true]],
    'Fluent': [['fluent.blue.light', 'blue light', false], ['fluent.blue.dark', 'blue dark', true],
      ['fluent.saas.light', 'saas light', false], ['fluent.saas.dark', 'saas dark', true]],
    'Material': [['material.blue.light', 'blue light', false], ['material.blue.dark', 'blue dark', true],
      ['material.lime.light', 'lime light', false], ['material.lime.dark', 'lime dark', true],
      ['material.orange.light', 'orange light', false], ['material.orange.dark', 'orange dark', true],
      ['material.purple.light', 'purple light', false], ['material.purple.dark', 'purple dark', true],
      ['material.teal.light', 'teal light', false], ['material.teal.dark', 'teal dark', true]],
    'Generic': [['light', 'light', false], ['dark', 'dark', true], ['carmine', 'carmine', false],
      ['softblue', 'softblue', false], ['greenmist', 'greenmist', false], ['contrast', 'contrast', false],
      ['darkmoon', 'darkmoon', true], ['darkviolet', 'darkviolet', true]]
  };
  var PAGES = [
    ['popup.html', 'Popup'], ['popover.html', 'Popover'], ['actionsheet.html', 'ActionSheet'],
    ['column-chooser.html', 'CardView: выбор колонок'], ['filemanager-dialog.html', 'FileManager: диалог'],
    ['toolbar-menu.html', 'Toolbar: меню'], ['tooltip.html', 'Tooltip'], ['slider-tooltip.html', 'Slider: подсказка'],
    ['chat-confirmation.html', 'Chat: подтверждение'], ['scheduler-popup.html', 'Scheduler: редактирование записи']
  ];
  var SIZE = { 1: 'xs', 2: 'sm', 4: 'md', 8: 'lg', 14: 'xl', 32: '2xl' };

  var THEME = new URLSearchParams(location.search).get('theme') || 'fluent-next.blue.light';
  var ENTRY = null;
  Object.keys(THEMES).forEach(function (g) {
    THEMES[g].forEach(function (t) { if (t[0] === THEME) { ENTRY = t; } });
  });
  if (!ENTRY) { ENTRY = THEMES['Fluent Next'][0]; THEME = ENTRY[0]; }
  document.write('<link rel="stylesheet" href="css/dx.' + THEME + '.css">');

  var style = document.createElement('style');
  style.textContent = [
    'body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; max-width: 1100px; }',
    'body.page-light { background: #fff; color: #222; }',
    'body.page-dark { background: #242424; color: #eee; }',
    'h2 { margin: 16px 0 4px; }',
    '.note { opacity: .75; margin: 0 0 12px; }',
    '.nav { display: flex; flex-wrap: wrap; gap: 4px 14px; padding-bottom: 8px; border-bottom: 1px solid #888; }',
    '.nav a { color: inherit; text-decoration: none; opacity: .7; padding: 2px 0; }',
    '.nav a:hover { text-decoration: underline; }',
    '.nav a.active { opacity: 1; font-weight: 700; border-bottom: 2px solid currentColor; }',
    '.picker { margin: 12px 0; }',
    '.picker label { font-weight: 600; margin-right: 8px; }',
    '.picker select { font: inherit; padding: 4px 8px; }',
    '#stage { position: relative; min-height: 380px; border: 1px dashed #888; padding: 16px; box-sizing: border-box; }',
    '#target { width: 90px; height: 32px; background: #bbb; color: #000; line-height: 32px; text-align: center; margin: 140px 0 0 160px; }',
    'table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 24px; }',
    'th, td { border: 1px solid #aaa; padding: 4px 8px; text-align: left; vertical-align: top; }',
    'th { background: #f3f3f3; color: #222; }',
    'code { font-size: 12px; }'
  ].join('\n');
  document.head.appendChild(style);

  function q(s) { return document.querySelector(s); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function weight(el) {
    if (!el) { return { size: 'элемент не найден', raw: '' }; }
    var b = getComputedStyle(el).boxShadow;
    if (!b || b === 'none') { return { size: 'none', raw: 'none' }; }
    var m = b.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/);
    return { size: m ? (SIZE[Math.round(+m[2])] || ('вне шкалы: y=' + m[2] + 'px, blur ' + m[3] + 'px')) : '?', raw: b };
  }

  function chrome(title, note) {
    var file = location.pathname.split('/').pop() || PAGES[0][0];
    var links = PAGES.map(function (p) {
      return '<a href="' + p[0] + '?theme=' + encodeURIComponent(THEME) + '"' + (p[0] === file ? ' class="active"' : '') + '>' + p[1] + '</a>';
    }).join('');
    var top = document.getElementById('top');
    top.innerHTML = '<div class="nav">' + links + '</div><h2>' + title + '</h2><p class="note">' + note + '</p>'
      + '<div class="picker"><label for="theme">Тема</label><select id="theme"></select></div>';
    var sel = document.getElementById('theme');
    Object.keys(THEMES).forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g;
      THEMES[g].forEach(function (t) {
        var o = document.createElement('option');
        o.value = t[0]; o.textContent = g + ' ' + t[1]; o.selected = t[0] === THEME;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    sel.addEventListener('change', function () { location.search = '?theme=' + encodeURIComponent(sel.value); });
  }

  window.ShadowDemo = {
    q: q,
    wait: wait,
    date: new Date(2024, 0, 15, 9),
    // cfg: { title, note, measured (селектор для подписи), create: async () => элемент с тенью }
    run: async function (cfg) {
      document.body.className = ENTRY[2] ? 'page-dark' : 'page-light';
      chrome(cfg.title, cfg.note);
      DevExpress.fx.off = true;
      // «Было» воспроизводится переопределением: до правки у этих элементов была тень 2xl.
      // Scheduler не менялся (cfg.unchanged): переключатель есть, но «Было» совпадает со «Стало». В других темах менять нечего.
      var canCompare = THEME.indexOf('fluent-next') === 0;
      var override = document.createElement('style');
      override.textContent = cfg.measured + ', .dx-popup-wrapper .dx-state-focused.dx-overlay-content { box-shadow: var(--dxds-box-shadow-2xl) !important; }';
      var state = new URLSearchParams(location.search).get('state') === 'before' ? 'before' : 'after';
      function apply(st) {
        if (override.parentNode) { override.parentNode.removeChild(override); }
        if (canCompare && !cfg.unchanged && st === 'before') { document.head.appendChild(override); }
      }
      var el = null, err = '';
      try { el = await cfg.create(); } catch (e) { err = e.message; }
      function measure(st) { apply(st); return err ? { size: 'ошибка: ' + err, raw: '' } : weight(el); }
      var before = measure('before'), after = measure('after');
      apply(state);

      var picker = document.querySelector('.picker');
      if (canCompare) {
        picker.insertAdjacentHTML('beforeend', ' <span style="margin-left:24px"><label><input type="radio" name="st" value="before"' + (state === 'before' ? ' checked' : '') + '> Было</label> '
          + '<label><input type="radio" name="st" value="after"' + (state === 'after' ? ' checked' : '') + '> Стало</label></span>');
        picker.addEventListener('change', function (e) {
          if (e.target.name === 'st') {
            apply(e.target.value);
            var u = new URL(location.href); u.searchParams.set('state', e.target.value); history.replaceState(null, '', u);
          }
        });
      }
      var cur = canCompare ? before : after;
      var head = canCompare ? '<th>Было</th><th>Стало</th>' : '<th>Вес тени</th>';
      var cells = canCompare ? '<td><b>' + before.size + '</b></td><td><b>' + after.size + '</b></td>' : '<td><b>' + (THEME.indexOf('fluent-next') === 0 ? after.size : '—') + '</b></td>';
      document.getElementById('bottom').innerHTML = '<table><thead><tr><th>Элемент</th>' + head + '<th>box-shadow (стало)</th></tr></thead>'
        + '<tbody><tr><td><code>' + cfg.measured + '</code></td>' + cells + '<td><code>' + after.raw + '</code></td></tr></tbody></table>'
        + '<p class="note">Вес — шкала Fluent Next по вертикальному смещению первой тени: xs 1px, sm 2px, md 4px, lg 8px, xl 14px, 2xl 32px. '
        + '«Было» воспроизведено переопределением тени на 2xl, как до правки. У Scheduler тень не менялась, поэтому «Было» и «Стало» совпадают. В других темах тени не менялись, для них показано только текущее значение.</p>';
    }
  };
}());
