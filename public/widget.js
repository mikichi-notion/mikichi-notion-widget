(function () {
	"use strict";

	let debounceTimer = null;
	let nextCursor = null;
	let currentQuery = "";
	let currentDateRange = "all";
	let selectedRange = "all";
	let optionsExpanded = false;
	let searchGen = 0;

	const input = document.getElementById("search-input");
	const btn = document.getElementById("search-btn");
	const optionsToggle = document.getElementById("options-toggle");
	const dateRangePicker = document.getElementById("date-range-picker");
	const drbButtons = document.querySelectorAll(".drb");
	const yearSelect = document.getElementById("year-select");
	const statusMsg = document.getElementById("status-msg");
	const resultsList = document.getElementById("results-list");
	const loadMoreBtn = document.getElementById("load-more");
	const suggestionsArea = document.getElementById("suggestions-area");
	const suggestionsList = document.getElementById("suggestions-list");

	function escHtml(str) {
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function setStatus(text, isError) {
		statusMsg.textContent = text;
		statusMsg.className = isError ? "error" : "";
	}

	function setupYearSelect() {
		const currentYear = new Date().getFullYear();
		yearSelect.innerHTML = "";
		for (let y = currentYear; y >= 2020; y--) {
			const opt = document.createElement("option");
			opt.value = "year:" + y;
			opt.textContent = y + "年";
			yearSelect.appendChild(opt);
		}
	}

	function getDateRangeParam() {
		if (selectedRange === "year") {
			return yearSelect.value || ("year:" + new Date().getFullYear());
		}
		return selectedRange;
	}

	// デフォルト: 1件（最新）、絞り込みON: 10件
	function getPageSize() {
		return optionsExpanded ? 10 : 1;
	}

	function clearResults() {
		resultsList.innerHTML = "";
		suggestionsList.innerHTML = "";
		suggestionsArea.style.display = "none";
		loadMoreBtn.style.display = "none";
	}

	function renderItems(list, results) {
		results.forEach(function (r) {
			const li = document.createElement("li");
			li.className = "result-item";

			const date = new Date(r.lastEditedTime).toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});

			const badge = r.object === "database"
				? '<span class="result-db-badge">DB</span>'
				: "";

			let metaHtml;
			if (r.meta && r.meta.length > 0) {
				metaHtml = r.meta.map(function (m) {
					return '<span class="result-meta-item"><span class="result-meta-label">' +
						escHtml(m.label) + "</span>" + escHtml(m.value) + "</span>";
				}).join("");
			} else {
				metaHtml = "最終更新: " + escHtml(date);
			}

			li.innerHTML =
				'<a class="result-title" href="' + escHtml(r.url) + '" target="_blank" rel="noopener noreferrer">' +
				escHtml(r.title) +
				"</a>" +
				'<div class="result-meta">' + badge + metaHtml + "</div>";

			list.appendChild(li);
		});
	}

	async function doSearch(append) {
		const q = input.value.trim();
		if (!q) {
			setStatus("", false);
			clearResults();
			return;
		}

		const dateRange = getDateRangeParam();
		const pageSize = getPageSize();
		const isNewSearch = !append || q !== currentQuery || dateRange !== currentDateRange;

		if (isNewSearch) {
			nextCursor = null;
			currentQuery = q;
			currentDateRange = dateRange;
			clearResults();
		}

		const gen = ++searchGen;

		setStatus("検索中…", false);

		const params = new URLSearchParams({ q: q, dateRange: dateRange, pageSize: String(pageSize) });
		if (nextCursor) params.set("cursor", nextCursor);

		try {
			const res = await fetch("/api/search?" + params.toString());
			const data = await res.json();

			if (gen !== searchGen) return;

			if (!res.ok) {
				setStatus("エラー: " + (data.error || "不明なエラー"), true);
				return;
			}

			const hasSuggestions = data.suggestions && data.suggestions.length > 0;

			if (!append && data.results.length === 0 && !hasSuggestions) {
				setStatus("結果が見つかりませんでした。", false);
				return;
			}

			if (!append && data.results.length === 0 && hasSuggestions) {
				setStatus("この範囲では見つかりませんでした。", false);
				suggestionsArea.style.display = "block";
				renderItems(suggestionsList, data.suggestions);
				return;
			}

			setStatus(append ? "" : data.results.length + " 件", false);
			renderItems(resultsList, data.results);

			nextCursor = data.nextCursor || null;
			loadMoreBtn.style.display = (optionsExpanded && data.hasMore) ? "block" : "none";
		} catch (_) {
			if (gen !== searchGen) return;
			setStatus("接続エラーが発生しました。再試行してください。", true);
		}
	}

	// 絞り込みトグル
	optionsToggle.addEventListener("click", function () {
		optionsExpanded = !optionsExpanded;
		if (optionsExpanded) {
			dateRangePicker.style.display = "flex";
			optionsToggle.innerHTML = "絞り込み &#x25BE;";
		} else {
			dateRangePicker.style.display = "none";
			optionsToggle.innerHTML = "絞り込み &#x25B8;";
			// 閉じたときは範囲をリセット
			selectedRange = "all";
			yearSelect.style.display = "none";
			drbButtons.forEach(function (x) { x.classList.remove("active"); });
			document.querySelector(".drb[data-range='all']").classList.add("active");
		}
		if (input.value.trim()) doSearch(false);
	});

	input.addEventListener("input", function () {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(function () { doSearch(false); }, 350);
	});

	input.addEventListener("keydown", function (e) {
		if (e.key === "Enter") {
			clearTimeout(debounceTimer);
			doSearch(false);
		}
	});

	btn.addEventListener("click", function () {
		clearTimeout(debounceTimer);
		doSearch(false);
	});

	drbButtons.forEach(function (b) {
		b.addEventListener("click", function () {
			drbButtons.forEach(function (x) { x.classList.remove("active"); });
			b.classList.add("active");
			selectedRange = b.dataset.range;
			yearSelect.style.display = selectedRange === "year" ? "inline-block" : "none";
			clearTimeout(debounceTimer);
			if (input.value.trim()) doSearch(false);
		});
	});

	yearSelect.addEventListener("change", function () {
		clearTimeout(debounceTimer);
		if (input.value.trim()) doSearch(false);
	});

	loadMoreBtn.addEventListener("click", function () { doSearch(true); });

	setupYearSelect();
})();
