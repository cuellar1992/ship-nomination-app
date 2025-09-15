// Other Jobs - Frontend bootstrap (SingleSelect + DateTimePickers)
(function() {
    const state = {
        singleSelects: {},
        dateTimes: {},
        editId: null,
        autoUpdatingIds: new Set(),
        debounceTimer: null,
        rows: [],
        pagination: { pageSize: 10, currentPage: 1 },
        searchTerm: '',
    };

    function log(level, message, extra = {}) {
        const logger = window.Logger;
        if (!logger || !level || typeof logger[level] !== 'function') return;
        logger[level](message, {
            module: 'OtherJobs',
            showNotification: true,
            notificationMessage: message,
            ...extra,
        });
    }

    function hoursBetween(start, end) {
        if (!start || !end) return 0;
        const ms = end.getTime() - start.getTime();
        if (ms <= 0) return 0;
        return +(ms / (1000 * 60 * 60)).toFixed(2);
    }

    function updateShiftHours() {
        const start = state.dateTimes.shiftStart?.getDateTime?.();
        const end = state.dateTimes.shiftEnd?.getDateTime?.();
        const hours = hoursBetween(start, end);
        const input = document.getElementById('shiftHours');
        if (input) input.value = hours || '';
    }

    function debounce(fn, delay = 300) {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(fn, delay);
    }

    async function loadSamplers() {
        try {
            const resp = await fetch('/api/samplers');
            const json = await resp.json();
            const items = (json.data || json || []).map(s => s.name).filter(Boolean);
            if (state.singleSelects.otherJobSampler && typeof state.singleSelects.otherJobSampler.updateItemsFromAPI === 'function') {
                state.singleSelects.otherJobSampler.updateItemsFromAPI(items);
            }
        } catch (e) {
            console.warn('Failed to load samplers', e);
            log('warn', 'Could not load sampler list', { error: e });
        }
    }

    function initSingleSelect() {
        if (typeof SingleSelect === 'undefined') return;
        
        // Main form sampler selector
        const containerId = 'otherJobSampler';
        const container = document.getElementById(containerId);
        if (!container) return;
        
        state.singleSelects.otherJobSampler = new SingleSelect(containerId, {
            placeholder: 'Select Who',
            showSearch: false,
            showManageOption: false,
            showLabel: false,
            icon: 'fas fa-user',
            label: 'Who',
        });
        loadSamplers();

        // Filter sampler SingleSelect
        const filterContainer = document.getElementById('filterSampler');
        if (filterContainer) {
            state.singleSelects.filterSampler = new SingleSelect('filterSampler', {
                placeholder: 'Any Person',
                showSearch: true,
                showManageOption: false,
                showLabel: false,
                icon: 'fas fa-user',
                label: 'Person',
                onSelectionChange: () => debounce(loadAndRenderList, 200),
            });
            // populate same list
            (async () => {
                try {
                    const resp = await fetch('/api/samplers');
                    const json = await resp.json();
                    const items = (json.data || json || []).map(s => s.name).filter(Boolean);
                    state.singleSelects.filterSampler.updateItemsFromAPI(['', ...items]);
                } catch {}
            })();
        }
    }

    function initDateTimePickers() {
        if (typeof DateTimePicker === 'undefined') return;
        
        // Shift times (operation date se calculará automáticamente desde shiftStart)
        state.dateTimes.shiftStart = new DateTimePicker('shiftStart', { 
            is24Hour: true, 
            minuteStep: 15,
            onDateTimeChange: (startDateTime) => {
                try {
                    // Aplicar restricción: END >= START
                    if (state?.dateTimes?.shiftEnd?.setMinDate) {
                        state.dateTimes.shiftEnd.setMinDate(startDateTime || null);
                    }
                    // Si END ya seleccionado es menor que START, limpiar END
                    const endVal = state?.dateTimes?.shiftEnd?.getDateTime?.();
                    if (startDateTime && endVal && endVal < startDateTime) {
                        state.dateTimes.shiftEnd.clearSelection?.(false);
                        window.NotificationService?.warn?.('END no puede ser menor que START');
                    }
                    // Precargar el mismo día en END para que el usuario solo ajuste la hora
                    if (startDateTime && state?.dateTimes?.shiftEnd) {
                        const endInst = state.dateTimes.shiftEnd;
                        const existingEnd = endInst.getDateTime?.();
                        const endDefault = endInst.config?.defaultTime || { hour: 12, minute: 0 };
                        const baseHour = existingEnd ? existingEnd.getHours() : endDefault.hour;
                        const baseMinute = existingEnd ? existingEnd.getMinutes() : endDefault.minute;
                        const needPreload = !existingEnd || existingEnd.toDateString() !== startDateTime.toDateString();
                        if (needPreload && typeof endInst.setDateTime === 'function') {
                            const preload = new Date(startDateTime);
                            preload.setHours(baseHour, baseMinute, 0, 0);
                            endInst.setDateTime(preload);
                        }
                    }
                } catch {}
                updateShiftHours();
            }
        });
        state.dateTimes.shiftEnd = new DateTimePicker('shiftEnd', { 
            is24Hour: true, 
            minuteStep: 15,
            onDateTimeChange: () => {
                updateShiftHours();
            }
        });
        // Sincronizar restricción inicial si ya había START
        try {
            const maybeStart = state.dateTimes.shiftStart?.getDateTime?.();
            if (maybeStart && state.dateTimes.shiftEnd?.setMinDate) {
                state.dateTimes.shiftEnd.setMinDate(maybeStart);
            }
        } catch {}
        
        // Fallback events for calculation: listen to native input changes inside containers
        const bindChange = (containerId) => {
            const c = document.getElementById(containerId);
            if (!c) return;
            c.addEventListener('change', updateShiftHours, true);
            c.addEventListener('input', updateShiftHours, true);
            c.addEventListener('blur', updateShiftHours, true);
        };
        bindChange('shiftStart');
        bindChange('shiftEnd');

        // Also listen to modal confirmation events by observing DOM changes
        const observer = new MutationObserver(() => updateShiftHours());
        ['shiftStart','shiftEnd'].forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { childList: true, subtree: true });
        });
    }

    function initDatePickers() {
        if (typeof DatePicker === 'undefined') return;
        
        // Initialize DatePicker filters
        state.dateFilters = state.dateFilters || {};
        if (document.getElementById('filterFrom')) {
            state.dateFilters.from = new DatePicker('filterFrom', {
                label: '',
                placeholder: 'From',
                modalTitle: 'Select From',
                allowEmpty: true,
                onDateChange: () => debounce(loadAndRenderList, 200),
            });
        }
        if (document.getElementById('filterTo')) {
            state.dateFilters.to = new DatePicker('filterTo', {
                label: '',
                placeholder: 'To',
                modalTitle: 'Select To',
                allowEmpty: true,
                onDateChange: () => debounce(loadAndRenderList, 200),
            });
        }
    }

    function collectPayload() {
        const description = document.getElementById('jobDescription')?.value?.trim() || '';
        const sampler = state.singleSelects.otherJobSampler?.getSelectedItem?.() || null;
        const shiftStart = state.dateTimes.shiftStart?.getDateTime?.() || null;
        const shiftEnd = state.dateTimes.shiftEnd?.getDateTime?.() || null;
        const hours = Number(document.getElementById('shiftHours')?.value || 0) || 0;

        // Calcular operationDate automáticamente desde shiftStart, o usar fecha actual como fallback
        const operationDate = shiftStart ? new Date(shiftStart.getFullYear(), shiftStart.getMonth(), shiftStart.getDate()) : new Date();

        return {
            jobDescription: description,
            operationDate: operationDate,
            samplerName: sampler,
            shift: { 
                startTime: shiftStart, 
                endTime: shiftEnd, 
                hours 
            },
            status: 'confirmed',
            terminal: 'Other'
        };
    }

    function setSaveButtonMode(isEdit) {
        const btn = document.getElementById('saveOtherJobFormBtn');
        if (!btn) return;
        btn.innerHTML = isEdit ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-save"></i> Save';
        // Aplicar color rojo elegante según memoria
        btn.className = isEdit ? 'btn btn-warning' : 'btn btn-premium';
    }

    function clearForm() {
        // Clear text area
        const descField = document.getElementById('jobDescription');
        if (descField) descField.value = '';
        
        // Clear SingleSelects
        Object.values(state.singleSelects).forEach(ss => ss?.clearSelection?.());
        
        // Clear DateTimes
        if (state.dateTimes.shiftStart?.setDateTime) state.dateTimes.shiftStart.setDateTime(null);
        if (state.dateTimes.shiftEnd?.setDateTime) state.dateTimes.shiftEnd.setDateTime(null);
        
        const input = document.getElementById('shiftHours');
        if (input) input.value = '';
        
        state.editId = null;
        setSaveButtonMode(false);
        log('success', 'Form cleared');
    }

    async function saveForm() {
        const payload = collectPayload();
        
        // Basic validation
        if (!payload.jobDescription) {
            log('warn', 'Job description is required');
            return;
        }
        if (!payload.samplerName) {
            log('warn', 'Please select who will perform this job');
            return;
        }
        
        try {
            const isEdit = !!state.editId;
            const url = isEdit ? `/api/otherjobs/${state.editId}` : '/api/otherjobs';
            const method = isEdit ? 'PUT' : 'POST';
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) throw new Error(json.error || 'Save failed');
            
            log('success', isEdit ? 'Other job updated' : 'Other job saved');
            console.log(isEdit ? 'Updated OtherJob:' : 'Saved OtherJob:', json.data);
            
            // Clear form after successful save
            clearForm();
            // Refresh list
            await loadAndRenderList();
        } catch (e) {
            console.error('Save error', e);
            log('error', 'Failed to save other job', { error: e });
        }
    }

    async function loadAndRenderList() {
        try {
            // Build query params from filters
            const from = state.dateFilters?.from?.getDate?.() || null;
            const toVal = state.dateFilters?.to?.getDate?.() || null;
            const sampler = state.singleSelects.filterSampler?.getSelectedItem?.() || '';
            const search = state.searchTerm || '';
            
            const params = new URLSearchParams();
            if (from) params.set('from', new Date(from).toISOString());
            if (toVal) {
                const dt = new Date(toVal);
                dt.setHours(23,59,59,999);
                params.set('to', dt.toISOString());
            }
            if (sampler) params.set('surveyor', sampler);
            if (search) params.set('search', search);
            
            const url = params.toString() ? `/api/otherjobs?${params}` : '/api/otherjobs';
            const resp = await fetch(url);
            const json = await resp.json();
            const rows = Array.isArray(json.data) ? json.data : [];
            state.rows = rows;
            
            // Reset to first page when dataset changes
            state.pagination.currentPage = 1;
            renderList(state.rows);
            
            // Auto-complete status where applicable
            evaluateAutoComplete(rows);
        } catch (e) {
            console.error('List load error', e);
            log('error', 'Failed to load records', { error: e });
        }
    }

    function formatDate(dt) {
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleDateString();
    }

    function formatTime(dt) {
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }

    function getSortedRows(rows) {
        const sortDir = state.sortDirection || 'desc';
        const sorted = [...rows].sort((a,b) => {
            const da = new Date(a.operationDate || a.createdAt || 0);
            const db = new Date(b.operationDate || b.createdAt || 0);
            return sortDir === 'asc' ? da - db : db - da;
        });
        return sorted;
    }

    function getFilteredRows(rows) {
        const sorted = getSortedRows(rows);
        const term = (state.searchTerm || '').toLowerCase();
        if (!term) return sorted;
        return sorted.filter(r => {
            const parts = [
                new Date(r.operationDate).toLocaleDateString(),
                r.jobDescription || '',
                r.samplerName || '',
                r.status || ''
            ].join(' ').toLowerCase();
            return parts.includes(term);
        });
    }

    function updatePaginationControls(totalItems, pageStart, pageEnd, currentPage, totalPages) {
        const info = document.getElementById('otherJobPageInfo');
        const prevBtn = document.getElementById('otherJobPrevPageBtn');
        const nextBtn = document.getElementById('otherJobNextPageBtn');
        const numbersContainer = document.getElementById('otherJobPageNumbers');
        
        if (info) {
            if (totalItems === 0) {
                info.textContent = 'No records';
            } else {
                info.textContent = `Showing ${pageStart}-${pageEnd} of ${totalItems} records`;
            }
        }
        if (prevBtn) prevBtn.disabled = currentPage <= 1 || totalPages <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages <= 1;

        if (numbersContainer) {
            numbersContainer.innerHTML = '';
            const createPageBtn = (page, isActive = false, isEllipsis = false) => {
                if (isEllipsis) {
                    const span = document.createElement('span');
                    span.className = 'page-dot';
                    span.textContent = '…';
                    numbersContainer.appendChild(span);
                    return;
                }
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = isActive ? 'icon-btn page-btn active' : 'icon-btn page-btn';
                btn.textContent = String(page);
                btn.addEventListener('click', () => {
                    if (state.pagination.currentPage !== page) {
                        state.pagination.currentPage = page;
                        renderList(state.rows || []);
                    }
                });
                numbersContainer.appendChild(btn);
            };
            
            const windowSize = 5;
            const pages = [];
            if (totalPages <= 7) {
                for (let p = 1; p <= totalPages; p++) pages.push(p);
            } else {
                const start = Math.max(2, currentPage - 2);
                const end = Math.min(totalPages - 1, currentPage + 2);
                pages.push(1);
                if (start > 2) pages.push('...');
                for (let p = start; p <= end; p++) pages.push(p);
                if (end < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
            pages.forEach(p => {
                if (p === '...') {
                    createPageBtn(0, false, true);
                } else {
                    createPageBtn(p, p === currentPage, false);
                }
            });
        }
    }

    function renderList(rows) {
        const tbody = document.getElementById('otherJobsTbody');
        if (!tbody) return;
        const filtered = getFilteredRows(rows);
        
        // Pagination
        const pageSize = Number(state.pagination?.pageSize || 10) || 10;
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        if (!state.pagination || typeof state.pagination.currentPage !== 'number') {
            state.pagination = { pageSize, currentPage: 1 };
        }
        if (state.pagination.currentPage > totalPages) state.pagination.currentPage = totalPages;
        if (state.pagination.currentPage < 1) state.pagination.currentPage = 1;
        const currentPage = state.pagination.currentPage;
        const startIndex = (currentPage - 1) * pageSize;
        const pageRows = filtered.slice(startIndex, startIndex + pageSize);

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state text-center">
                        <i class="fas fa-briefcase"></i>
                        No other jobs yet. Use the form above to create one.
                    </td>
                </tr>`;
            updatePaginationControls(0, 0, 0, 1, 1);
            return;
        }
        
        const html = pageRows.map(r => {
            const shiftInfo = r.shift?.startTime && r.shift?.endTime 
                ? `${formatTime(r.shift.startTime)} - ${formatTime(r.shift.endTime)}`
                : '—';
            const hours = r.shift?.hours || 0;
            return `
                <tr data-id="${r._id}">
                    <td>${formatDate(r.operationDate)}</td>
                    <td title="${r.jobDescription || ''}">${(r.jobDescription || '').substring(0, 50)}${(r.jobDescription || '').length > 50 ? '...' : ''}</td>
                    <td>${r.samplerName || ''}</td>
                    <td>${hours}h</td>
                    <td>${r.status || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" data-action="view" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-warning" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
        tbody.innerHTML = html;
        
        const pageStart = totalItems === 0 ? 0 : startIndex + 1;
        const pageEnd = Math.min(startIndex + pageSize, totalItems);
        updatePaginationControls(totalItems, pageStart, pageEnd, currentPage, totalPages);
        
        // Wire view
        tbody.querySelectorAll('button[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.currentTarget.closest('tr');
                const id = tr?.getAttribute('data-id');
                if (!id) return;
                try {
                    const resp = await fetch(`/api/otherjobs/${id}`);
                    const json = await resp.json();
                    if (!resp.ok || !json.success) throw new Error(json.error || 'Fetch failed');
                    openViewModal(json.data);
                } catch (err) {
                    console.error('View error', err);
                    log('error', 'Failed to load record', { error: err });
                }
            });
        });
        
        // Wire edit
        tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.currentTarget.closest('tr');
                const id = tr?.getAttribute('data-id');
                if (!id) return;
                try {
                    const resp = await fetch(`/api/otherjobs/${id}`);
                    const json = await resp.json();
                    if (!resp.ok || !json.success) throw new Error(json.error || 'Fetch failed');
                    populateFormForEdit(json.data);
                    state.editId = id;
                    setSaveButtonMode(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    window.NotificationService?.info?.('Loaded for editing');
                } catch (err) {
                    console.error('Edit load error', err);
                    log('error', 'Failed to load for editing', { error: err });
                }
            });
        });
        
        // Wire delete with confirmation modal
        tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.currentTarget.closest('tr');
                const id = tr?.getAttribute('data-id');
                if (!id) return;
                const dateText = tr.querySelector('td:nth-child(1)')?.textContent?.trim() || '';
                const descText = tr.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
                const itemName = `${dateText}${descText ? ' - ' + descText : ''}` || 'Other Job';

                const proceed = await (window.DeleteConfirmationModal?.show ?
                  window.DeleteConfirmationModal.show({
                    itemName,
                    itemType: 'Other Job',
                    componentName: 'Other Jobs',
                    onConfirm: () => {},
                    onCancel: () => {},
                  }) : Promise.resolve(confirm('Delete this record?')));

                if (!proceed) return;

                try {
                    const resp = await fetch(`/api/otherjobs/${id}`, { method: 'DELETE' });
                    const json = await resp.json();
                    if (!resp.ok || !json.success) throw new Error(json.error || 'Delete failed');
                    log('success', 'Deleted successfully');
                    await loadAndRenderList();
                } catch (err) {
                    console.error('Delete error', err);
                    log('error', 'Failed to delete', { error: err });
                }
            });
        });
    }

    function getCompletionCutoff(doc) {
        const shiftEnd = doc?.shift?.endTime ? new Date(doc.shift.endTime) : null;
        const operationDate = doc?.operationDate ? new Date(doc.operationDate) : null;
        return shiftEnd || operationDate || null;
    }

    function shouldBeCompleted(doc) {
        if (!doc) return false;
        if (doc.status === 'completed') return false;
        const cutoff = getCompletionCutoff(doc);
        if (!cutoff) return false;
        const now = new Date();
        return now > cutoff;
    }

    async function evaluateAutoComplete(rows) {
        const candidates = (rows || []).filter(shouldBeCompleted);
        for (const doc of candidates) {
            const id = doc._id;
            if (!id || state.autoUpdatingIds.has(id)) continue;
            try {
                state.autoUpdatingIds.add(id);
                const resp = await fetch(`/api/otherjobs/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' })
                });
                const json = await resp.json();
                if (!resp.ok || !json.success) throw new Error(json.error || 'Auto-complete failed');
                log('info', 'Status auto-updated to completed', { id });
            } catch (err) {
                console.error('Auto-complete error', err);
                log('warn', 'Could not auto-complete status', { error: err });
            } finally {
                state.autoUpdatingIds.delete(doc._id);
            }
        }
        if (candidates.length) {
            // Refresh list to reflect updated statuses
            await loadAndRenderList();
        }
    }

    function openViewModal(doc) {
        const modalId = 'otherJobViewModal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();
        
        const shiftInfo = doc.shift?.startTime && doc.shift?.endTime 
            ? `${formatTime(doc.shift.startTime)} - ${formatTime(doc.shift.endTime)} (${doc.shift?.hours || 0}h)`
            : '—';
            
        const html = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" style="max-width: 640px;">
            <div class="modal-content settings-modal">
              <div class="modal-header settings-header">
                <h5 class="modal-title settings-title"><i class="fas fa-briefcase me-2"></i>Other Job Details</h5>
              </div>
              <div class="modal-body settings-body">
                <div class="row g-3">
                  <div class="col-12"><strong>Description:</strong><br/>${doc.jobDescription || ''}</div>
                  <div class="col-6"><strong>Date:</strong> ${formatDate(doc.operationDate)}</div>
                  <div class="col-6"><strong>Assigned To:</strong> ${doc.samplerName || ''}</div>
                  <div class="col-6"><strong>Status:</strong> ${doc.status || ''}</div>
                  <div class="col-6"><strong>Terminal:</strong> ${doc.terminal || ''}</div>
                  <div class="col-12"><strong>Shift:</strong> ${shiftInfo}</div>
                </div>
              </div>
              <div class="modal-footer settings-footer">
                <button type="button" class="btn btn-secondary-premium" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    function populateFormForEdit(doc) {
        // Job description
        const descField = document.getElementById('jobDescription');
        if (descField) descField.value = doc.jobDescription || '';
        
        // Who
        state.singleSelects.otherJobSampler?.setSelectedItem?.(doc.samplerName || '');
        
        // Shift (operation date se calcula automáticamente desde shiftStart)
        if (doc.shift?.startTime) state.dateTimes.shiftStart?.setDateTime?.(new Date(doc.shift.startTime));
        if (doc.shift?.endTime) state.dateTimes.shiftEnd?.setDateTime?.(new Date(doc.shift.endTime));
        const input = document.getElementById('shiftHours');
        if (input) input.value = (typeof doc.shift?.hours === 'number') ? doc.shift.hours : '';
    }

    function setQuickDateFilter(period) {
        const now = new Date();
        let fromDate, toDate;

        if (period === 'week') {
            // This week (Monday to Sunday)
            const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 6 days after Monday
            
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - daysToMonday);
            fromDate.setHours(0, 0, 0, 0);
            
            toDate = new Date(fromDate);
            toDate.setDate(fromDate.getDate() + 6);
            toDate.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
            // This month (1st to last day)
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            fromDate.setHours(0, 0, 0, 0);
            
            toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            toDate.setHours(23, 59, 59, 999);
        }

        // Set the DatePicker values
        if (state.dateFilters?.from && fromDate) {
            state.dateFilters.from.setDate(fromDate);
        }
        if (state.dateFilters?.to && toDate) {
            state.dateFilters.to.setDate(toDate);
        }

        // Trigger filter
        debounce(loadAndRenderList, 200);
        
        // Show confirmation
        const periodText = period === 'week' ? 'This Week' : 'This Month';
        log('info', `Filter set to ${periodText}`, { 
            from: fromDate?.toLocaleDateString(),
            to: toDate?.toLocaleDateString()
        });
    }

    function exportListAsCSV() {
        const tbody = document.getElementById('otherJobsTbody');
        if (!tbody) return;
        const rows = [...tbody.querySelectorAll('tr')];
        const csv = [];
        csv.push(['Date','Description','Who','Hours','Status'].join(','));
        rows.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 5) return; // skip empty-state
            const row = [0,1,2,3,4].map(i => {
                const text = (tds[i].textContent || '').trim();
                return '"' + text.replace(/"/g,'""') + '"';
            });
            csv.push(row.join(','));
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `other-jobs_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log('success', 'Exported CSV');
    }

    document.addEventListener('DOMContentLoaded', function() {
        initSingleSelect();
        initDateTimePickers();
        initDatePickers();
        loadAndRenderList();
        
        // Wire buttons
        document.getElementById('clearOtherJobFormBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            clearForm();
        });
        
        document.getElementById('saveOtherJobFormBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await saveForm();
        });
        
        document.getElementById('otherJobClearBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            // Clear advanced filters: from, to, sampler
            try {
                state.dateFilters?.from?.clearSelection?.(false);
                state.dateFilters?.to?.clearSelection?.(false);
            } catch {}
            try {
                state.singleSelects?.filterSampler?.clearSelection?.();
            } catch {}
            // Clear search
            const searchInput = document.getElementById('otherJobSearchInput');
            if (searchInput) {
                searchInput.value = '';
                state.searchTerm = '';
            }
            await loadAndRenderList();
            log('success', 'Advanced filters cleared');
        });
        
        document.getElementById('otherJobExportBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (window.OtherJobsExporter) {
                    const exporter = new window.OtherJobsExporter(() => {
                        const from = state.dateFilters?.from?.getDate?.() || null;
                        const to = state.dateFilters?.to?.getDate?.() || null;
                        const sampler = state.singleSelects.filterSampler?.getSelectedItem?.() || '';
                        const search = state.searchTerm || '';
                        return { from, to, sampler, search };
                    });
                    await exporter.export();
                } else {
                    exportListAsCSV();
                }
            } catch (err) {
                console.error('Export error', err);
                exportListAsCSV();
            }
        });
        
        document.getElementById('otherJobAdvancedToggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = document.getElementById('otherJobAdvancedPanel');
            if (!panel) return;
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Quick filter buttons
        document.getElementById('otherJobThisWeekBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            setQuickDateFilter('week');
        });

        document.getElementById('otherJobThisMonthBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            setQuickDateFilter('month');
        });
        
        // Search integrated with pagination
        document.getElementById('otherJobSearchInput')?.addEventListener('input', (e) => {
            state.searchTerm = (e.target.value || '').toLowerCase().trim();
            state.pagination.currentPage = 1;
            renderList(state.rows || []);
        });

        // Pagination controls
        const pageSizeSelect = document.getElementById('otherJobPageSizeSelect');
        if (pageSizeSelect) {
            state.pagination.pageSize = Number(pageSizeSelect.value) || 10;
            pageSizeSelect.addEventListener('change', (ev) => {
                state.pagination.pageSize = Number(ev.target.value) || 10;
                state.pagination.currentPage = 1;
                renderList(state.rows || []);
            });
        }
        
        const prevBtn = document.getElementById('otherJobPrevPageBtn');
        const nextBtn = document.getElementById('otherJobNextPageBtn');
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (state.pagination.currentPage > 1) {
                    state.pagination.currentPage -= 1;
                    renderList(state.rows || []);
                }
            });
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Compute total pages based on current filters
                const totalItems = getFilteredRows(state.rows || []).length;
                const totalPages = Math.max(1, Math.ceil(totalItems / (Number(state.pagination.pageSize) || 10)));
                if (state.pagination.currentPage < totalPages) {
                    state.pagination.currentPage += 1;
                    renderList(state.rows || []);
                }
            });
        }

        // Date sort toggle
        const sortBtn = document.getElementById('otherJobDateSortToggle');
        if (sortBtn) {
            state.sortDirection = 'desc';
            // Establecer ícono inicial
            const icon = sortBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sort-amount-down';
            }
            sortBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
                // update icon
                const icon = sortBtn.querySelector('i');
                if (icon) {
                    icon.className = state.sortDirection === 'asc' ? 'fas fa-sort-amount-up' : 'fas fa-sort-amount-down';
                }
                await loadAndRenderList();
            });
        }
    });
})();
