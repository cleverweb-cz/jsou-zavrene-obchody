class Main {
	icsUrl;
	range = 7;
	startDate = new Date();

	constructor(icsUrl) {
		this.icsUrl = icsUrl;
		this.startDate.setHours(0, 0, 0, 0);
	}

	async loadIcs() {
		const response = await fetch(this.icsUrl);
		const text = await response.text();
		return this.parseIcs(text);
	}

	parseIcs(text) {
		const events = [];
		const lines = text.split(/\r?\n/);
		let currentEvent = null;

		for (let line of lines) {
			if (line.startsWith('BEGIN:VEVENT')) {
				currentEvent = {};
			} else if (line.startsWith('END:VEVENT')) {
				events.push(currentEvent);
				currentEvent = null;
			} else if (currentEvent) {
				if (line.startsWith('DTSTART')) {
					const match = line.match(/VALUE=DATE:(\d{8})/);
					if (match) {
						currentEvent.start = match[1];
					}
				} else if (line.startsWith('RRULE')) {
					if (line.includes('FREQ=YEARLY')) {
						currentEvent.yearly = true;
					}
				} else if (line.startsWith('RDATE')) {
					const match = line.match(/VALUE=DATE:(.*)/);
					if (match) {
						currentEvent.dates = match[1].split(',');
					}
				}
			}
		}
		return events;
	}

	isClosed(date, events) {
		const ymd = date.getFullYear() +
			String(date.getMonth() + 1).padStart(2, '0') +
			String(date.getDate()).padStart(2, '0');
		const md = ymd.substring(4);

		for (const event of events) {
			if (event.dates && event.dates.includes(ymd)) {
				return true;
			}
			if (event.start === ymd) {
				return true;
			}
			if (event.yearly && event.start && event.start.substring(4) === md) {
				return true;
			}
		}
		return false;
	}


	async run() {
		const events = await this.loadIcs();
		const calendarUl = document.querySelector('.calendar');
		if (!calendarUl) return;

		calendarUl.innerHTML = '';

		const days = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

		let anyClosedFuture = false;
		for (let i = 0; i < this.range; i++) {
			const currentDate = new Date(this.startDate);
			currentDate.setDate(this.startDate.getDate() + i);

			const closed = this.isClosed(currentDate, events);
			if (closed && i > 0) {
				anyClosedFuture = true;
			}
			const li = document.createElement('li');
			if (closed) {
				li.className = 'yes';
			}

			const dayName = days[currentDate.getDay()];
			const dateStr = `${currentDate.getDate()}.&#x202F;${currentDate.getMonth() + 1}.`;
			let html = '';
			if (i === 0) {
				html += `
			<div class="progress">
				<div>Zde stojíte<br>&#x1F6D2;</div>
				<div></div>
			</div>`;
			}

			html += `
			<em>${dayName}</em>
			<h3>${dateStr}</h3>
			<i>${closed ? '&#x1F62B;' : '&#x1F600;'}</i>
			<blockquote>${closed ? 'Ano' : 'Ne'}</blockquote>`;

			li.innerHTML = html;
			calendarUl.appendChild(li);
		}

		// Update header if today is closed
		const isTodayClosed = this.isClosed(this.startDate, events);
		const headerSpan = document.querySelector('header h1 span');
		if (headerSpan) {
			let statusText = 'Ne';
			let statusClass = 'no';

			if (isTodayClosed) {
				statusText = 'Ano';
				statusClass = 'yes';
			} else if (anyClosedFuture) {
				statusText = 'Ne, ale budou';
				statusClass = 'future';
			}

			headerSpan.className = statusClass;
			headerSpan.textContent = `${statusText}`;
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	(new Main('jsou-zavrene-obchody.ics')).run();
});
