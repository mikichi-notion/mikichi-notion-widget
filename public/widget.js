(function () {
	"use strict";

	let debounceTimer = null;
	let nextCursor = null;
	let currentQuery = "";
	let currentDbId = "";

	const input = document.getElementById("search-input");
	const btn = document.getElementById("search-btn");
	const dbPicker = document.getElementById("db-picker");
	const dbSelect = document.getElementById("db-select");
	const statusMsg = document.getElementById("status-msg");
	const resultsList = document.getElementById("results-list");
	const loadMoreBtn = document.getElementById("load-more");

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

	async function loadDatabases() {
		try {
			const res = await fetch("/api/databases");
			if (!res.ok) return;
			const data = await res.json();
			if (!data.databases || data.databases.length === 0) return;

			data.databases.forEach(function (db) {
				const opt = document.createElement("option");
				opt.value = db.id;
				opt.textContent = db.title;
				dbSelect.appendChild(opt);
			});
			dbPicker.style.display = "flex";
		} catch (_) {
			// DBピッカーはオプション — 失敗しても無視
		}
	}

	function renderResults(results) {
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

			// DB固有のmeta（日付・レベルなど）があればそちらを優先表示
			let metaHtml;
			if (r.meta && r.meta.length > 0) {
				metaHtml = r.meta.map(function (m) {
					return '<span class="result-meta-item"><span class="result-meta-label">' +
						escHtml(m.label) + '</span>' + escHtml(m.value) + '</span>';
				}).join("");
			} else {
				metaHtml = "最終更新: " + escHtml(date);
			}

			li.innerHTML =
				'<a class="result-title" href="' + escHtml(r.url) + '" target="_blank" rel="noopener noreferrer">' +
				escHtml(r.title) +
				"</a>" +
				'<div class="result-meta">' + badge + metaHtml + "</div>";

			resultsList.appendChild(li);
		});
	}

	async function doSearch(append) {
		const q = input.value.trim();
		if (!q) {
			setStatus("", false);
			resultsList.innerHTML = "";
			loadMoreBtn.style.display = "none";
			return;
		}

		const dbId = dbSelect.value;

		if (!append || q !== currentQuery || dbId !== currentDbId) {
			nextCursor = null;
			currentQuery = q;
			currentDbId = dbId;
			if (!append) resultsList.innerHTML = "";
		}

		setStatus("検索中…", false);
		loadMoreBtn.style.display = "none";

		const params = new URLSearchParams({ q: q });
		if (dbId) params.set("databaseId", dbId);
		if (nextCursor) params.set("cursor", nextCursor);

		try {
			const res = await fetch("/api/search?" + params.toString());
			const data = await res.json();

			if (!res.ok) {
				setStatus("エラー: " + (data.error || "不明なエラー"), true);
				return;
			}

			if (!append && data.results.length === 0) {
				setStatus("結果が見つかりませんでした。", false);
				return;
			}

			setStatus(append ? "" : data.results.length + " 件", false);
			renderResults(data.results);

			nextCursor = data.nextCursor || null;
			loadMoreBtn.style.display = data.hasMore ? "block" : "none";
		} catch (_) {
			setStatus("接続エラーが発生しました。再試行してください。", true);
		}
	}

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

	dbSelect.addEventListener("change", function () {
		if (input.value.trim()) doSearch(false);
	});

	loadMoreBtn.addEventListener("click", function () { doSearch(true); });

	loadDatabases();
})();
