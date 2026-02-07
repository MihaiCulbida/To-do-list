class TodoApp {
            constructor() {
                this.containers = [];
                this.activeContainer = null;
                this.selectedContainer = null;
                this.pressTimer = null;
                this.init();
            }

            init() {
                this.loadFromStorage();
                this.setupEventListeners();
                this.render();
                this.updateEmptyState();
            }

            setupEventListeners() {
                document.getElementById('addButton').addEventListener('click', () => this.addContainer());
                
                document.getElementById('deleteButton').addEventListener('click', () => {
                    if (this.selectedContainer) {
                        this.showConfirmDialog();
                    }
                });

                document.getElementById('confirmYes').addEventListener('click', () => {
                    this.deleteContainer(this.selectedContainer);
                    this.hideConfirmDialog();
                });

                document.getElementById('confirmNo').addEventListener('click', () => {
                    this.hideConfirmDialog();
                });
                
                document.getElementById('overlay').addEventListener('click', () => {
                    if (this.activeContainer) {
                        this.collapseAll();
                        this.render();
                    } else {
                        this.hideConfirmDialog();
                    }
                });

                document.getElementById('toolbar').addEventListener('click', (e) => {
                    const btn = e.target.closest('.toolbar-btn');
                    if (btn && this.activeContainer) {
                        this.handleToolbarAction(btn.dataset.action);
                    }
                });
            }

            addContainer() {
                const container = {
                    id: Date.now(),
                    title: '',
                    content: '',
                    expanded: false,
                    lastModified: new Date().toISOString()
                };
                this.containers.push(container);
                this.saveToStorage();
                this.render();
                this.updateEmptyState();
            }

            handlePressStart(id, event) {
                event.preventDefault();
                this.pressTimer = setTimeout(() => {
                    this.selectContainer(id);
                }, 500);
            }

            handlePressEnd(id, event) {
                clearTimeout(this.pressTimer);
                
                if (!this.selectedContainer || this.selectedContainer !== id) {
                    setTimeout(() => {
                        if (!this.selectedContainer || this.selectedContainer !== id) {
                            this.expandContainer(id);
                        }
                    }, 50);
                }
            }

            selectContainer(id) {
                if (this.selectedContainer === id) {
                    this.selectedContainer = null;
                } else {
                    this.selectedContainer = id;
                }
                
                this.updateDeleteButton();
                this.render();
            }

            expandContainer(id) {
                this.collapseAll();
                this.selectedContainer = null;
                const container = this.containers.find(c => c.id === id);
                if (container) {
                    container.expanded = true;
                    this.activeContainer = id;
                    this.render();
                    this.updateDeleteButton();
                    this.updateToolbar();
                    
                    setTimeout(() => {
                        const element = document.querySelector(`[data-id="${id}"] .container-content`);
                        if (element) {
                            element.focus();
                        }
                    }, 100);
                }
            }

            collapseAll() {
                this.containers.forEach(c => c.expanded = false);
                this.activeContainer = null;
                this.updateToolbar();
            }

            closeContainer(id) {
                const container = this.containers.find(c => c.id === id);
                if (container) {
                    container.expanded = false;
                    this.activeContainer = null;
                    this.render();
                    this.updateToolbar();
                }
            }

            deleteContainer(id) {
                this.containers = this.containers.filter(c => c.id !== id);
                this.selectedContainer = null;
                this.saveToStorage();
                this.render();
                this.updateEmptyState();
                this.updateDeleteButton();
            }

            showConfirmDialog() {
                document.getElementById('confirmDialog').classList.add('show');
                document.getElementById('overlay').classList.add('show');
            }

            hideConfirmDialog() {
                document.getElementById('confirmDialog').classList.remove('show');
                if (!this.activeContainer) {
                    document.getElementById('overlay').classList.remove('show');
                }
            }

            updateContainer(id, field, content) {
                const container = this.containers.find(c => c.id === id);
                if (container) {
                    container[field] = content;
                    container.lastModified = new Date().toISOString();
                    this.saveToStorage();
                    
                    this.updateMetadata(id);
                }
            }
            formatDate(isoString) {
                if (!isoString) return '';
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                
                if (diffMins < 1) return 'now';
                if (diffMins < 60) return `${diffMins} min`;
                if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours`;
                
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const mins = String(date.getMinutes()).padStart(2, '0');
                
                return `${day}.${month}.${year} ${hours}:${mins}`;
            }
            
            getCharCount(html) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                return temp.textContent.trim().length;
            }
            updateMetadata(id) {
                const container = this.containers.find(c => c.id === id);
                if (!container || !container.expanded) return;
                
                const containerElement = document.querySelector(`[data-id="${id}"]`);
                if (!containerElement) return;
                
                const metadataElement = containerElement.querySelector('.container-metadata');
                if (metadataElement) {
                    const charCount = this.getCharCount(container.content);
                    metadataElement.textContent = `${this.formatDate(container.lastModified)} | ${charCount} characters`;
                }
            }
            updateDeleteButton() {
                const deleteBtn = document.getElementById('deleteButton');
                deleteBtn.classList.toggle('active', this.selectedContainer !== null);
            }

            updateToolbar() {
                const toolbar = document.getElementById('toolbar');
                toolbar.classList.toggle('show', this.activeContainer !== null);
            }
            handleToolbarAction(action) {
                if (!this.activeContainer) return;
                
                const containerElement = document.querySelector(`[data-id="${this.activeContainer}"]`);
                const contentElement = containerElement.querySelector('.container-content');
                const selection = window.getSelection();
                const selectedText = selection.toString();
                
                if (action === 'bold' && selectedText) {
                    document.execCommand('bold', false, null);
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'textcolor' && selectedText) {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = '#FF9800';
                    input.style.position = 'absolute';
                    input.style.opacity = '0';
                    input.style.pointerEvents = 'none';
                    
                    const btn = document.querySelector('[data-action="textcolor"]');
                    btn.appendChild(input);
                    
                    input.addEventListener('change', (e) => {
                        document.execCommand('foreColor', false, e.target.value);
                        const container = this.containers.find(c => c.id === this.activeContainer);
                        if (container) {
                            container.content = contentElement.innerHTML;
                            container.lastModified = new Date().toISOString();
                            this.saveToStorage();
                            this.updateMetadata(this.activeContainer);
                        }
                        input.remove();
                    });
                    
                    input.click();
                } else if (action === 'italic' && selectedText) {
                    document.execCommand('italic', false, null);
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'underline' && selectedText) {
                    document.execCommand('underline', false, null);
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'strikethrough' && selectedText) {
                    document.execCommand('strikeThrough', false, null);
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'checkbox') {
                    if (!selectedText) {
                        return;
                    }
                    
                    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                    if (range) {
                        const isInContent = contentElement.contains(range.commonAncestorContainer);
                        
                        if (!isInContent) {
                            return;
                        }
                    }
                    
                    if (selectedText) {
                        let node = range.commonAncestorContainer;
                        let parentCheckbox = null;
                        
                        while (node && node !== contentElement) {
                            if (node.nodeType === 1 && node.classList && node.classList.contains('checkbox-item')) {
                                parentCheckbox = node;
                                break;
                            }
                            node = node.parentNode;
                        }
                        
                        if (parentCheckbox) {
                            this.removeCheckbox(parentCheckbox, contentElement);
                        } else {
                            this.addCheckboxToSelection(contentElement, selection);
                        }
                    } else {
                        this.addCheckboxes(contentElement);
                    }
                    this.updateContainer(this.activeContainer, 'content', contentElement.innerHTML);
                }
            }
            removeCheckbox(checkboxItem, contentElement) {
    const span = checkboxItem.querySelector('span');
    if (!span) return;
    
    const fragment = document.createDocumentFragment();
    while (span.firstChild) {
        fragment.appendChild(span.firstChild);
    }
    
    checkboxItem.parentNode.replaceChild(fragment, checkboxItem);
    
    this.attachCheckboxListeners(contentElement, this.activeContainer);
}
            addCheckboxToSelection(element, selection) {
                const range = selection.getRangeAt(0);
                const selectedText = selection.toString().trim();
                
                if (!selectedText) return;
                
                const div = document.createElement('div');
                div.className = 'checkbox-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.setAttribute('contenteditable', 'false'); 
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    div.classList.toggle('checked', e.target.checked);
                    this.updateContainer(this.activeContainer, 'content', element.innerHTML);
                });
                
                const label = document.createElement('span');
                label.textContent = selectedText;
                
                div.appendChild(checkbox);
                div.appendChild(label);
                
                range.deleteContents();
                range.insertNode(div);
                
                selection.removeAllRanges();
            }
            
            addCheckboxes(element) {
                const originalHTML = element.innerHTML.trim();
                if (!originalHTML) return;
                
                const lines = originalHTML.split('<br>').filter(line => line.trim());
                
                if (lines.length === 0) {
                    lines.push(originalHTML);
                }
                
                element.innerHTML = '';
                
                lines.forEach(lineHTML => {
                    const div = document.createElement('div');
                    div.className = 'checkbox-item';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.setAttribute('contenteditable', 'false');
                    checkbox.addEventListener('change', (e) => {
                        e.stopPropagation();
                        div.classList.toggle('checked', e.target.checked);
                        this.updateContainer(this.activeContainer, 'content', element.innerHTML);
                    });
                    
                    const label = document.createElement('span');
                    label.innerHTML = lineHTML.trim();
                    
                    div.appendChild(checkbox);
                    div.appendChild(label);
                    element.appendChild(div);
                });
            }
            setupCheckboxEnterKey(element, containerId) {
                element.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const selection = window.getSelection();
                        const range = selection.getRangeAt(0);
                        const container = range.commonAncestorContainer;
                        
                        let checkboxItem = container.nodeType === 3 ? container.parentNode : container;
                        while (checkboxItem && !checkboxItem.classList.contains('checkbox-item')) {
                            checkboxItem = checkboxItem.parentNode;
                        }
                        
                        if (checkboxItem && checkboxItem.classList.contains('checkbox-item')) {
                            e.preventDefault();
                            
                            if (e.shiftKey) {
                                document.execCommand('insertHTML', false, '<br>');
                            } else {
                                const newDiv = document.createElement('div');
                                newDiv.className = 'checkbox-item';
                                
                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.setAttribute('contenteditable', 'false');
                                checkbox.addEventListener('change', (ev) => {
                                    ev.stopPropagation();
                                    newDiv.classList.toggle('checked', ev.target.checked);
                                    this.updateContainer(containerId, 'content', element.innerHTML);
                                });
                                
                                const label = document.createElement('span');
                                label.innerHTML = '<br>';
                                
                                newDiv.appendChild(checkbox);
                                newDiv.appendChild(label);
                                
                                checkboxItem.parentNode.insertBefore(newDiv, checkboxItem.nextSibling);
                                
                                const newRange = document.createRange();
                                newRange.setStart(label, 0);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            }
                        }
                    }
                });
            }
            render() {
                const wrapper = document.getElementById('containersWrapper');
                const overlay = document.getElementById('overlay');
                wrapper.innerHTML = '';
                
                const hasExpanded = this.containers.some(c => c.expanded);
                overlay.classList.toggle('show', hasExpanded);
                
                this.containers.forEach((container, index) => {
                    const div = document.createElement('div');
                    const isSelected = this.selectedContainer === container.id;
                    div.className = `container ${container.expanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''} ${index === this.containers.length - 1 && !container.expanded ? 'new' : ''}`;
                    div.dataset.id = container.id;
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'close-btn';
                    closeBtn.innerHTML = '×';
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.closeContainer(container.id);
                    });
                    
                    const title = document.createElement('div');
                    title.className = 'container-title';
                    title.contentEditable = true;
                    title.textContent = container.title;
                    
                    title.addEventListener('input', () => {
                        this.updateContainer(container.id, 'title', title.textContent);
                    });
                    
                    title.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    
                    const content = document.createElement('div');
                    content.className = 'container-content';
                    content.contentEditable = container.expanded;
                    content.innerHTML = container.content;
                    
                    this.attachCheckboxListeners(content, container.id);
                    if (container.expanded) {
                        this.setupCheckboxEnterKey(content, container.id);
                    }
                    if (!container.expanded) {
                        div.addEventListener('mousedown', (e) => {
                            this.handlePressStart(container.id, e);
                        });
                        
                        div.addEventListener('mouseup', (e) => {
                            this.handlePressEnd(container.id, e);
                        });
                        
                        div.addEventListener('mouseleave', () => {
                            clearTimeout(this.pressTimer);
                        });
                        
                        div.addEventListener('touchstart', (e) => {
                            this.handlePressStart(container.id, e);
                        });
                        
                        div.addEventListener('touchend', (e) => {
                            this.handlePressEnd(container.id, e);
                        });
                    }
                    
                    content.addEventListener('input', () => {
                        this.updateContainer(container.id, 'content', content.innerHTML);
                    });
                    
                    if (container.expanded) {
                        const metadata = document.createElement('div');
                        metadata.className = 'container-metadata';
                        const charCount = this.getCharCount(container.content);
                        metadata.textContent = `${this.formatDate(container.lastModified)} | ${charCount} characters`;
                        
                        div.appendChild(closeBtn);
                        div.appendChild(title);
                        div.appendChild(metadata);
                        div.appendChild(content);
                    } else {
                        const timestamp = document.createElement('div');
                        timestamp.className = 'container-timestamp';
                        timestamp.textContent = this.formatDate(container.lastModified);
                        
                        div.appendChild(closeBtn);
                        div.appendChild(title);
                        div.appendChild(content);
                        div.appendChild(timestamp);
                    }
                    
                    wrapper.appendChild(div);
                });
            }            
            updateEmptyState() {
                const emptyState = document.querySelector('.empty-state');
                emptyState.classList.toggle('hidden', this.containers.length > 0);
            }

            attachCheckboxListeners(element, containerId) {
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const parentDiv = checkbox.closest('.checkbox-item');
                    
                    if (parentDiv && parentDiv.classList.contains('checked')) {
                        checkbox.checked = true;
                    }
                    
                    checkbox.setAttribute('contenteditable', 'false');
                    
                    checkbox.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                    });
                    
                    checkbox.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    
                    checkbox.addEventListener('change', (e) => {
                        e.stopPropagation();
                        if (parentDiv) {
                            parentDiv.classList.toggle('checked', e.target.checked);
                        }
                        this.updateContainer(containerId, 'content', element.innerHTML);
                    });
                });
            }
            saveToStorage() {
                localStorage.setItem('todoContainers', JSON.stringify(this.containers));
            }

            loadFromStorage() {
                const saved = localStorage.getItem('todoContainers');
                if (saved) {
                    this.containers = JSON.parse(saved);
                    this.containers.forEach(c => {
                        c.expanded = false;
                        if (!c.hasOwnProperty('title')) {
                            c.title = '';
                        }
                    });
                }
            }
        }

    const app = new TodoApp();