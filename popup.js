var addr, curOpen, coinOpen;

function dataDisplay(r) {
  if (debug) console.log('dataDisplay r=', r);
  var coinsel =
    '<div class="sel-cont"><select id="coin"><option value="eth"' +
    (r.coin == 'eth' ? ' selected' : '') +
    '>ETH<option value="etc"' +
    (r.coin == 'etc' ? ' selected' : '') +
    '>ETC</select></div>';
  if (r.nodata) {
    var p = '⛏';
    document.getElementById('data_wrap').innerHTML =
      '<div id="mid_wrap">No data found. Do some mining. ' + p + '</div><div id="nodata_coin">' + coinsel + '</div>';
    document.getElementById('coin').addEventListener('change', () => {
      coinChange(r);
    });
    return updateBadge(r);
  }
  var cs = calcStats(r);
  var r = getETA(r);
  var html =
    '<div id="mid_wrap">Hashrate: ' +
    cs.hashrate +
    '<br>Valor a ser pago: ' +
    cs.unpaid +
    ' / ' +
    cs.minpayout +
    '<br>Tempo até o próximo pagamento: ' +
    r.eta +
    (r.lt24h ? '<span class="lt24h" title="Total estimado para pagamento é menos de 24hrs.">?</span>' : '') +
    '</div>';
  var cursel = '<div class="sel-cont"><select id="cur">';
  for (var c in r.rates) cursel += '<option value="' + c + '"' + (c == r.currency ? ' selected' : '') + '>' + c;
  cursel += '</select></div>';
  html +=
    '<table><tr><th></th><th>Hora</th><th>Dia</th><th>Mês</th><th>Ano</th></tr><tr><td class="sel">' +
    coinsel +
    '</td><td>' +
    cs.coinsph +
    '</td><td>' +
    cs.coinspd +
    '</td><td>' +
    cs.coinspm +
    '</td><td>' +
    cs.coinspy +
    '</td></tr><tr><td class="sel">' +
    cursel +
    '</td><td>' +
    cs.curph +
    '</td><td>' +
    cs.curpd +
    '</td><td>' +
    cs.curpm +
    '</td><td>' +
    cs.curpy +
    '</td></tr></table>';
  html +=
    '<a target="_blank" href="https://' +
    (r.coin == 'etc' ? 'etc.' : '') +
    'ethermine.org/miners/' +
    addr +
    '">Painel</a> | <a target="_blank" href="https://' +
    (r.coin == 'etc' ? 'etc.' : '') +
    'ethermine.org/miners/' +
    addr +
    '/payouts">Pagamentos</a> | <a target="_blank" href="https://' +
    (r.coin == 'etc' ? 'etc.' : '') +
    'ethermine.org/miners/' +
    addr +
    '/settings">Configuração</a>';
  document.getElementById('data_wrap').innerHTML = html;
  // events, keep track of selects so we can skip update if open
  document.getElementById('coin').addEventListener('change', () => {
    coinChange(r);
  });
  coinOpen = false;
  document.getElementById('coin').addEventListener('click', () => {
    coinOpen = !coinOpen;
  });
  document.getElementById('coin').addEventListener('blur', () => {
    if (coinOpen) coinOpen = false;
  });
  document.addEventListener('keyup', function (e) {
    if (e.keyCode == 27) if (coinOpen) coinOpen = false;
  });
  document.getElementById('cur').addEventListener('change', () => {
    curChange(r);
  });
  curOpen = false;
  document.getElementById('cur').addEventListener('click', () => {
    curOpen = !curOpen;
  });
  document.getElementById('cur').addEventListener('blur', () => {
    if (curOpen) curOpen = false;
  });
  document.addEventListener('keyup', function (e) {
    if (e.keyCode == 27) if (curOpen) curOpen = false;
  });
  updateBadge(r, cs);
}

function coinChange(r) {
  if (debug) console.log('coinChange() val=', document.getElementById('coin').value);
  document.getElementById('coin').blur();
  r.coin = document.getElementById('coin').value;
  localStorage.setItem('lastresponse', JSON.stringify(r));
  coinOpen = false;
  updateData(1);
}

function curChange(r) {
  if (debug) console.log('curChange() val=', document.getElementById('cur').value);
  document.getElementById('cur').blur();
  r.currency = document.getElementById('cur').value;
  localStorage.setItem('lastresponse', JSON.stringify(r));
  curOpen = false;
  updateData();
}

function updateData(nocache) {
  if (debug) console.log('updateData(' + nocache + ')');
  if (coinOpen || curOpen) {
    if (debug) console.log('select open (' + coinOpen + ',' + curOpen + '), skipping');
    return;
  }
  loadData(
    {
      nocache: nocache,
      addr: addr,
    },
    (r, e) => {
      if (e) return (document.getElementById('data_wrap').innerHTML = '<div id="error">' + e.replace(/\n/g, '<br>') + '</div>');
      dataDisplay(r);
      // todo: location.reload on currency change only if window shrinks due to no data
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  function treatData(obj) {
    if (debug) console.log(obj);
    if (!obj.data || !obj.data.addr) var error = 'first'; // no error message
    if (!error && !obj.data.addr) var error = 'noaddr';
    if (!error) {
      if (debug) console.log('testing addr');
      if (obj.data.addr.substr(0, 2) != '0x') obj.data.addr = '0x' + obj.data.addr;
      var p = /^0x[a-fA-F0-9]{40}$/;
      if (!p.test(obj.data.addr)) var error = 'invalidaddr';
    }
    if (!error) {
      addr = obj.data.addr;
      document.body.innerHTML +=
        '<div id="addr_wrap">' +
        addr.substr(2) +
        ' <a id="rw" href="javascript:;" title="Remover carteira">x</a></div><div id="data_wrap"></div>';
      updateData();
      setInterval(updateData, 30000);
      document.getElementById('rw').addEventListener('click', function () {
        if (confirm('Tem certeza que deseja remover a carteira?')) {
          localStorage.setItem('addr', '');
          location.reload();
        }
      });
    } else {
      // address entry page
      if (debug) console.log('error=' + error);
      if (error != 'first') if (obj.data.addr) localStorage.setItem('addr', obj.data.addr);
      if (error == 'noaddr') document.body.innerHTML += '<div id="error">Adicione uma carteira.</div>';
      else if (error == 'invalidaddr') {
        document.body.innerHTML += '<div id="error">Carteira inválida. Tente novamente.</div>';
        localStorage.setItem('addr', '');
      }
      document.body.innerHTML += 'Adicionar carteira:<br><input id="addr" size="30"> <button id="add">Adicionar</button><br>';
      document.getElementById('addr').value = localStorage.getItem('addr');
      if (document.getElementById('addr').value === '') document.getElementById('addr').focus();
      document.getElementById('addr').addEventListener(
        'blur',
        (addrblur = function () {
          localStorage.setItem('addr', document.getElementById('addr').value);
        })
      );
      document.getElementById('addr').addEventListener(
        'focus',
        (addrsel = function () {
          document.getElementById('addr').select();
        })
      );
      document.getElementById('add').addEventListener('click', function () {
        // save wallet infos
        localStorage.setItem('addr', document.getElementById('addr').value);
        document.getElementById('addr').removeEventListener('blur', addrblur);
        location.reload();
      });
    }
  }
  treatData({ data: { addr: localStorage.getItem('addr') } });
});
