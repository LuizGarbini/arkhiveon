(function () {
  function getVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  var accent = getVar('--accent');
  var accent2 = getVar('--accent2');
  var ink = getVar('--ink');
  var muted = getVar('--muted');
  var rule = getVar('--rule');
  var bg2 = getVar('--bg2');

  var scoreEl = document.getElementById('chart-scores');
  if (scoreEl && window.echarts) {
    var scoreChart = echarts.init(scoreEl, null, { renderer: 'svg' });
    scoreChart.setOption({
      animation: false,
      color: [accent],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
      grid: { left: 60, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: 'category',
        data: ['Technical', 'UX', 'UI', 'Product', 'Scalability'],
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, interval: 0, rotate: 0 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'bar',
        data: [58, 61, 68, 64, 55],
        barWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: accent },
        label: { show: true, position: 'top', color: ink, fontWeight: 700 }
      }]
    });
    window.addEventListener('resize', function () { scoreChart.resize(); });
  }

  var issueEl = document.getElementById('chart-issues');
  if (issueEl && window.echarts) {
    var issueChart = echarts.init(issueEl, null, { renderer: 'svg' });
    issueChart.setOption({
      animation: false,
      color: [accent2],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
      grid: { left: 150, right: 20, top: 20, bottom: 20 },
      xAxis: {
        type: 'value',
        min: 0,
        max: 10,
        axisLine: { show: false },
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'category',
        data: [
          'Bundle weight',
          'Component bloat',
          'State persistence',
          'Test coverage',
          'Product packaging',
          'Onboarding',
          'Loading/error UX'
        ],
        axisLine: { show: false },
        axisLabel: { color: muted }
      },
      series: [{
        type: 'bar',
        data: [9, 9, 8, 8, 8, 7, 7],
        barWidth: 18,
        itemStyle: {
          color: function (params) {
            return params.data >= 8 ? accent : accent2;
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right', color: ink, fontWeight: 700 }
      }]
    });
    window.addEventListener('resize', function () { issueChart.resize(); });
  }
})();
