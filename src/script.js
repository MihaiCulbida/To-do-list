class TodoApp {
            constructor() {
                this.containers = [];
                this.folders = [];
                this.activeContainer = null;
                this.selectedContainer = null;
                this.pressTimer = null;
                this.currentFolderId = null; 
                this.folderHistory = [];
                this.init();
            }

            init() {
                this.loadFromStorage();
                this.setupEventListeners();
                this.render();
                this.updateEmptyState();
            }

            setupEventListeners() {
                document.getElementById('addButton').addEventListener('click', () => {
                    this.showTypeSelector();
                });
                
                document.getElementById('typeSelectorModal').addEventListener('click', (e) => {
                    if (e.target.classList.contains('type-selector-modal')) {
                        this.hideTypeSelector();
                    }
                    
                    const option = e.target.closest('.type-option');
                    if (option) {
                        const type = option.dataset.type;
                        this.hideTypeSelector();
                        
                        if (type === 'container') {
                            this.addContainer();
                        } else if (type === 'folder') {
                            this.addFolder();
                        }
                    }
                });
                
                document.getElementById('deleteButton').addEventListener('click', () => {
                    if (this.selectedContainer) {
                        this.showConfirmDialog();
                    }
                });
            
                document.getElementById('confirmYes').addEventListener('click', () => {
                    if (this.selectedContainer) {
                        this.deleteContainer(this.selectedContainer);
                    }
                    this.hideConfirmDialog();
                });
            
                document.getElementById('confirmNo').addEventListener('click', () => {
                    this.hideConfirmDialog();
                });
            
                document.getElementById('overlay').addEventListener('click', () => {
                    const confirmDialog = document.getElementById('confirmDialog');
                    if (confirmDialog.classList.contains('show')) {
                        return;
                    }
                    
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
                document.getElementById('backButton').addEventListener('click', () => {
                    this.navigateBack(); 
                });
            }

            addContainer() {
                const container = {
                    id: Date.now(),
                    type: 'container',
                    title: '',
                    content: '',
                    expanded: false,
                    parentId: this.currentFolderId,
                    lastModified: new Date().toISOString()
                };
                this.containers.push(container);
                if (this.currentFolderId) {
                    this.updateFolderTimestamps(this.currentFolderId);
                }
                this.saveToStorage();
                this.render();
                this.updateEmptyState();
            }

            showTypeSelector() {
                document.getElementById('typeSelectorModal').classList.add('show');
            }
            
            hideTypeSelector() {
                document.getElementById('typeSelectorModal').classList.remove('show');
            }
            
            addFolder() {
                const folder = {
                    id: Date.now(),
                    type: 'folder',
                    title: '',
                    content: '', 
                    expanded: false, 
                    parentId: this.currentFolderId,
                    lastModified: new Date().toISOString()
                };
                this.containers.push(folder);
                if (this.currentFolderId) {
                    this.updateFolderTimestamps(this.currentFolderId);
                }
                this.saveToStorage();
                this.render();
                this.updateEmptyState();
            }
            
            openFolder(id) {
                if (this.currentFolderId !== null) {
                    this.folderHistory.push(this.currentFolderId); 
                }
                this.currentFolderId = id;
                this.render();
                this.updateBreadcrumb();
            }
            
            navigateToRoot() {
                this.currentFolderId = null;
                this.folderHistory = [];
                this.render();
                this.updateBreadcrumb();
            }

            navigateBack() {
                if (this.folderHistory.length > 0) {
                    this.currentFolderId = this.folderHistory.pop(); 
                } else {
                    this.currentFolderId = null; 
                }
                this.render();
                this.updateBreadcrumb();
            }
            
            updateBreadcrumb() {
                const breadcrumb = document.getElementById('breadcrumb');
                const backButton = document.getElementById('backButton');
                
                if (!breadcrumb) {
                    const bc = document.createElement('div');
                    bc.id = 'breadcrumb';
                    bc.className = 'breadcrumb';
                    document.body.appendChild(bc);
                }
                
                const breadcrumbEl = document.getElementById('breadcrumb');
                breadcrumbEl.innerHTML = '';
                
                if (this.currentFolderId === null) {
                    breadcrumbEl.classList.remove('show');
                    backButton.classList.remove('show');
                    return;
                }
                
                breadcrumbEl.classList.add('show');
                backButton.classList.add('show');
                
                const rootItem = document.createElement('span');
                rootItem.className = 'breadcrumb-item';
                rootItem.textContent = 'Home';
                rootItem.addEventListener('click', () => this.navigateToRoot());
                breadcrumbEl.appendChild(rootItem);
                
                const path = [...this.folderHistory, this.currentFolderId];
                
                path.forEach((folderId, index) => {
                    const sep = document.createElement('span');
                    sep.className = 'breadcrumb-separator';
                    sep.textContent = '/';
                    breadcrumbEl.appendChild(sep);
                    
                    const folder = this.containers.find(c => c.id === folderId);
                    if (folder) {
                        const folderItem = document.createElement('span');
                        folderItem.className = index === path.length - 1 ? 'breadcrumb-item active' : 'breadcrumb-item';
                        folderItem.textContent = folder.title || 'Untitled Folder';
                        
                        if (index < path.length - 1) {
                            folderItem.addEventListener('click', () => {
                                this.folderHistory = this.folderHistory.slice(0, index);
                                this.currentFolderId = folderId;
                                this.render();
                                this.updateBreadcrumb();
                            });
                        }
                        
                        breadcrumbEl.appendChild(folderItem);
                    }
                });
            }

            handlePressStart(id, event) {
                event.preventDefault();
                const container = this.containers.find(c => c.id === id);
                const isFolder = container && container.type === 'folder';
                
                this.pressTimer = setTimeout(() => {
                    this.selectContainer(id);
                }, 500);
            }
            
            handlePressEnd(id, event) {
                clearTimeout(this.pressTimer);
                
                const container = this.containers.find(c => c.id === id);
                const isFolder = container && container.type === 'folder';
                
                if (!this.selectedContainer || this.selectedContainer !== id) {
                    setTimeout(() => {
                        if (!this.selectedContainer || this.selectedContainer !== id) {
                            if (isFolder) {
                                this.openFolder(id);
                            } else {
                                this.expandContainer(id);
                            }
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
                const container = this.containers.find(c => c.id === id);
                const parentId = container ? container.parentId : null;  
                
                if (container && container.type === 'folder') {
                    const childContainers = this.containers.filter(c => c.parentId === id);
                    childContainers.forEach(child => {
                        this.deleteContainer(child.id); 
                    });
                }
                
                this.containers = this.containers.filter(c => c.id !== id);
                this.selectedContainer = null;
                
                if (parentId) {
                    this.updateFolderTimestamps(parentId);
                }
                
                this.saveToStorage();
                this.render();
                this.updateEmptyState();
                this.updateDeleteButton();
            }

            showConfirmDialog() {
                const container = this.containers.find(c => c.id === this.selectedContainer);
                const isFolder = container && container.type === 'folder';
                const dialogText = document.querySelector('.confirm-dialog-text');
                
                if (isFolder) {
                    dialogText.textContent = 'Are you sure you want to delete this folder and all its contents?';
                } else {
                    dialogText.textContent = 'Are you sure you want to delete this container?';
                }
                
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
                    
                    if (container.parentId) {
                        this.updateFolderTimestamps(container.parentId);
                    }
                }
            }
            updateFolderTimestamps(folderId) {
                const folder = this.containers.find(c => c.id === folderId);
                if (!folder) return;
                
                const now = new Date().toISOString();
                folder.lastModified = now;
                
                if (folder.parentId) {
                    this.updateFolderTimestamps(folder.parentId);
                }
            }
            
            getLastModifiedInFolder(folderId) {
                const children = this.containers.filter(c => c.parentId === folderId);
                
                if (children.length === 0) {
                    const folder = this.containers.find(c => c.id === folderId);
                    return folder ? folder.lastModified : null;
                }
                
                let latestTime = null;
                
                children.forEach(child => {
                    let childTime;
                    if (child.type === 'folder') {
                        childTime = this.getLastModifiedInFolder(child.id);
                    } else {
                        childTime = child.lastModified;
                    }
                    
                    if (!latestTime || (childTime && new Date(childTime) > new Date(latestTime))) {
                        latestTime = childTime;
                    }
                });
                
                const folder = this.containers.find(c => c.id === folderId);
                if (folder && folder.lastModified) {
                    if (!latestTime || new Date(folder.lastModified) > new Date(latestTime)) {
                        latestTime = folder.lastModified;
                    }
                }
                
                return latestTime;
            }
            formatDate(isoString) {
                if (!isoString) return '';
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                
                const hours = String(date.getHours()).padStart(2, '0');
                const mins = String(date.getMinutes()).padStart(2, '0');
                const timeStr = `${hours}:${mins}`;
                
                if (diffMins < 1) return 'now';
                if (diffMins < 60) return `${diffMins} min`;
                if (diffHours < 24) return timeStr;
                if (diffHours < 48) return `yesterday ${timeStr}`;
                
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                
                return `${day}.${month}.${year} ${timeStr}`;
            }
            
            getCharCount(html) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                
                const bullets = temp.querySelectorAll('.bullet-point');
                bullets.forEach(bullet => bullet.remove());

                const numbers = temp.querySelectorAll('.number-point');
                numbers.forEach(number => number.remove());
                
                const checkboxes = temp.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.remove());
                
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
                
                if (this.activeContainer !== null) {
                    toolbar.style.display = 'flex';
                    
                    setTimeout(() => {
                        toolbar.classList.add('show');
                    }, 700);
                } else {
                    toolbar.classList.remove('show');
                    
                    setTimeout(() => {
                        if (!this.activeContainer) {
                            toolbar.style.display = 'none';
                        }
                    }, 500);
                }
            }
            handleToolbarAction(action) {
                if (!this.activeContainer) return;
                
                if (action === 'text') {
                    const textButtons = document.querySelectorAll('.toolbar-btn.text-formatting');
                    textButtons.forEach(btn => {
                        btn.classList.toggle('visible');
                    });
                    return;
                }
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
                    const underlines = contentElement.querySelectorAll('u');
                    underlines.forEach(u => {
                        u.style.textDecorationColor = 'currentColor';
                    });
                    
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'strikethrough' && selectedText) {
                    document.execCommand('strikeThrough', false, null);
                    const strikes = contentElement.querySelectorAll('strike, s');
                    strikes.forEach(s => {
                        s.style.textDecorationColor = 'currentColor';
                    });
                
                    const container = this.containers.find(c => c.id === this.activeContainer);
                    if (container) {
                        container.content = contentElement.innerHTML;
                        container.lastModified = new Date().toISOString();
                        this.saveToStorage();
                        this.updateMetadata(this.activeContainer);
                    }
                } else if (action === 'colorpath' && selectedText) {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = '#FFEB3B';
                    input.style.position = 'absolute';
                    input.style.opacity = '0';
                    input.style.pointerEvents = 'none';
                    
                    const btn = document.querySelector('[data-action="colorpath"]');
                    btn.appendChild(input);
                    
                    input.addEventListener('change', (e) => {
                        document.execCommand('backColor', false, e.target.value);
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
            } else if (action === 'checkbox') {
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
            } else if (action === 'dotlist') {
                const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                if (range) {
                    const isInContent = contentElement.contains(range.commonAncestorContainer);
                    
                    if (!isInContent) {
                        return;
                    }
                }
                
                if (selectedText) {
                    let node = range.commonAncestorContainer;
                    let parentBullet = null;
                    
                    while (node && node !== contentElement) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('bullet-item')) {
                            parentBullet = node;
                            break;
                        }
                        node = node.parentNode;
                    }
                    
                    if (parentBullet) {
                        this.removeBullet(parentBullet, contentElement);
                    } else {
                        this.addBulletToSelection(contentElement, selection);
                    }
                } else {
                    this.addBullets(contentElement);
                }
                this.updateContainer(this.activeContainer, 'content', contentElement.innerHTML);
            } else if (action === 'numberlist') {
                const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                if (range) {
                    const isInContent = contentElement.contains(range.commonAncestorContainer);
                    
                    if (!isInContent) {
                        return;
                    }
                }
                
                if (selectedText) {
                    let node = range.commonAncestorContainer;
                    let parentNumber = null;
                    
                    while (node && node !== contentElement) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('number-item')) {
                            parentNumber = node;
                            break;
                        }
                        node = node.parentNode;
                    }
                    
                    if (parentNumber) {
                        this.removeNumber(parentNumber, contentElement);
                    } else {
                        this.addNumberToSelection(contentElement, selection);
                    }
                } else {
                    this.addNumbers(contentElement);
                }
                this.updateContainer(this.activeContainer, 'content', contentElement.innerHTML);
            }
            }
            removeCheckbox(checkboxItem, contentElement) {
                 const span = checkboxItem.querySelector('span');
                 if (!span) return;
                 
                 const textContent = span.textContent || span.innerText;
                 const textNode = document.createTextNode(textContent);
                 
                 const br = document.createElement('br');
                 
                 const parent = checkboxItem.parentNode;
                 parent.insertBefore(textNode, checkboxItem);
                 parent.insertBefore(br, checkboxItem);
                 
                 checkboxItem.remove();
             }
             
             removeBullet(bulletItem, contentElement) {
                 const span = bulletItem.querySelector('span:last-child');
                 if (!span) return;
                 
                 const textContent = span.textContent || span.innerText;
                 const textNode = document.createTextNode(textContent);
                 
                 const br = document.createElement('br');
                 
                 const parent = bulletItem.parentNode;
                 parent.insertBefore(textNode, bulletItem);
                 parent.insertBefore(br, bulletItem);
                 
                 bulletItem.remove();
             }
             preventBulletFormatting(element) {
                 element.addEventListener('input', (e) => {
                     const bullets = element.querySelectorAll('.bullet-point');
                     bullets.forEach(bullet => {
                         bullet.style.fontWeight = 'normal';
                         bullet.style.textDecoration = 'none';
                         bullet.style.fontStyle = 'normal';
                         bullet.style.backgroundColor = 'transparent';
                         
                         if (bullet.parentElement) {
                             const computedColor = window.getComputedStyle(bullet.parentElement.querySelector('span:last-child')).color;
                             bullet.style.color = computedColor;
                         }
                     });
                 });
             }
             
             addBulletToSelection(element, selection) {
                const range = selection.getRangeAt(0);
                let selectedText = selection.toString().trim();
                
                if (!selectedText) return;
                
                const startContainer = range.startContainer;
                const endContainer = range.endContainer;
                
                let startNode = startContainer.nodeType === 3 ? startContainer.parentNode : startContainer;
                if (startNode.classList && (startNode.classList.contains('bullet-point') || startNode.classList.contains('number-point'))) {
                    return;
                }
                
                let endNode = endContainer.nodeType === 3 ? endContainer.parentNode : endContainer;
                if (endNode.classList && (endNode.classList.contains('bullet-point') || endNode.classList.contains('number-point'))) {
                    return;
                }
                
                const itemsToRemove = [];
                const allItems = element.querySelectorAll('.checkbox-item, .bullet-item, .number-item');
                
            allItems.forEach(item => {
                const label = item.querySelector('span:last-child');
                if (label) {
                    const labelText = label.textContent || label.innerText || '';
                    const labelStart = selectedText.indexOf(labelText.trim());
                    
                    if (labelStart !== -1) {
                        itemsToRemove.push(item);
                    }
                }
            });
                
                if (itemsToRemove.length > 0) {
                    const allAreBullets = itemsToRemove.every(item => item.classList.contains('bullet-item'));
                    
                    if (allAreBullets) {
                        itemsToRemove.forEach(item => {
                            this.removeBullet(item, element);
                        });
                        return;
                    }
                    const wasNumberList = itemsToRemove.some(item => item.classList.contains('number-item'));
                    
                    itemsToRemove.forEach((item) => {
                        const parent = item.parentNode;
                        const labelSpan = item.querySelector('span:last-child');
                        const lineText = labelSpan ? (labelSpan.innerHTML || '').trim() : '';
                        
                        const div = document.createElement('div');
                        div.className = 'bullet-item';
                        
                        const bullet = document.createElement('span');
                        bullet.className = 'bullet-point';
                        bullet.textContent = '•';
                        bullet.setAttribute('contenteditable', 'false');
                        
                        const label = document.createElement('span');
                        label.innerHTML = lineText;
                        
                        div.appendChild(bullet);
                        div.appendChild(label);
                        
                        parent.replaceChild(div, item);
                    });
                    
                    if (wasNumberList) {
                        this.renumberList(element);
                    }
                } else {
                    selectedText = selectedText.replace(/^•\s*/gm, '').replace(/^\d+\.\s*/gm, '').trim();
                    range.deleteContents();
                    
                    const lines = selectedText.split('\n').filter(line => line.trim());
                    const fragment = document.createDocumentFragment();
                    
                    lines.forEach((line) => {
                        const div = document.createElement('div');
                        div.className = 'bullet-item';
                        
                        const bullet = document.createElement('span');
                        bullet.className = 'bullet-point';
                        bullet.textContent = '•';
                        bullet.setAttribute('contenteditable', 'false');
                        
                        const label = document.createElement('span');
                        label.textContent = line.trim();
                        
                        div.appendChild(bullet);
                        div.appendChild(label);
                        fragment.appendChild(div);
                    });
                    
                    range.insertNode(fragment);
                }
                
                selection.removeAllRanges();
            }
             
             addBullets(element) {
                 const originalHTML = element.innerHTML.trim();
                 if (!originalHTML) return;
                 
                 const lines = originalHTML.split('<br>').filter(line => line.trim());
                 
                 if (lines.length === 0) {
                     lines.push(originalHTML);
                 }
                 
                 element.innerHTML = '';
                 
                 lines.forEach(lineHTML => {
                     const div = document.createElement('div');
                     div.className = 'bullet-item';
                     
                     const bullet = document.createElement('span');
                     bullet.className = 'bullet-point';
                     bullet.textContent = '•';
                     bullet.setAttribute('contenteditable', 'false');
                     
                     const label = document.createElement('span');
                     label.innerHTML = lineHTML.trim();
                     
                     div.appendChild(bullet);
                     div.appendChild(label);
                     element.appendChild(div);
                 });
             }
             
             setupBulletEnterKey(element, containerId) {
                 element.addEventListener('keydown', (e) => {
                     if (e.key === 'Enter') {
                         const selection = window.getSelection();
                         const range = selection.getRangeAt(0);
                         const container = range.commonAncestorContainer;
                         
                         let bulletItem = container.nodeType === 3 ? container.parentNode : container;
                         while (bulletItem && !bulletItem.classList.contains('bullet-item')) {
                             bulletItem = bulletItem.parentNode;
                         }
                         
                         if (bulletItem && bulletItem.classList.contains('bullet-item')) {
                             e.preventDefault();
                             
                             if (e.shiftKey) {
                                 document.execCommand('insertHTML', false, '<br>');
                             } else {
                                 const label = bulletItem.querySelector('span:last-child');
                                 const textAfterCursor = this.getTextAfterCursor(range, label);
                                 
                                 if (textAfterCursor) {
                                     this.removeTextAfterCursor(range, label);
                                 }
                                 
                                 const newDiv = document.createElement('div');
                                 newDiv.className = 'bullet-item';
                                 
                                 const bullet = document.createElement('span');
                                 bullet.className = 'bullet-point';
                                 bullet.textContent = '•';
                                 bullet.setAttribute('contenteditable', 'false');
                                 
                                 const newLabel = document.createElement('span');
                                 newLabel.innerHTML = textAfterCursor || '<br>';
                                 
                                 newDiv.appendChild(bullet);
                                 newDiv.appendChild(newLabel);
                                 
                                 bulletItem.parentNode.insertBefore(newDiv, bulletItem.nextSibling);
                                 
                                 const newRange = document.createRange();
                                 newRange.setStart(newLabel, 0);
                                 newRange.collapse(true);
                                 selection.removeAllRanges();
                                 selection.addRange(newRange);
                             }
                         }
                        }
                    });
                }
                removeNumber(numberItem, contentElement) {
                    const span = numberItem.querySelector('span:last-child');
                    if (!span) return;
                    
                    const textContent = span.textContent || span.innerText;
                    const textNode = document.createTextNode(textContent);
                    
                    const br = document.createElement('br');
                    
                    const parent = numberItem.parentNode;
                    parent.insertBefore(textNode, numberItem);
                    parent.insertBefore(br, numberItem);
                    
                    numberItem.remove();
                    
                    this.renumberList(contentElement);
                }
                
                renumberList(element) {
                    const numberItems = element.querySelectorAll('.number-item');
                    numberItems.forEach((item, index) => {
                        const numberPoint = item.querySelector('.number-point');
                        if (numberPoint) {
                            numberPoint.textContent = `${index + 1}.`;
                        }
                    });
                }
                
                addNumberToSelection(element, selection) {
                    const range = selection.getRangeAt(0);
                    let selectedText = selection.toString().trim();
                    
                    if (!selectedText) {
                        const div = document.createElement('div');
                        div.className = 'number-item';
                        
                        const existingNumbers = element.querySelectorAll('.number-item').length;
                        
                        const number = document.createElement('span');
                        number.className = 'number-point';
                        number.textContent = `${existingNumbers + 1}.`;
                        number.setAttribute('contenteditable', 'false');
                        
                        const label = document.createElement('span');
                        label.innerHTML = '<br>';
                        
                        div.appendChild(number);
                        div.appendChild(label);
                        
                        range.insertNode(div);
                        
                        const newRange = document.createRange();
                        newRange.setStart(label, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        
                        this.renumberList(element);
                        return;
                    }
                    
                    const startContainer = range.startContainer;
                    const endContainer = range.endContainer;
                    
                    let startNode = startContainer.nodeType === 3 ? startContainer.parentNode : startContainer;
                    if (startNode.classList && (startNode.classList.contains('number-point') || startNode.classList.contains('bullet-point'))) {
                        return;
                    }
                    
                    let endNode = endContainer.nodeType === 3 ? endContainer.parentNode : endContainer;
                    if (endNode.classList && (endNode.classList.contains('number-point') || endNode.classList.contains('bullet-point'))) {
                        return;
                    }
                    
                    const itemsToRemove = [];
                    const allItems = element.querySelectorAll('.checkbox-item, .bullet-item, .number-item');
                    
                allItems.forEach(item => {
                    const label = item.querySelector('span:last-child');
                    if (label) {
                        const labelText = label.textContent || label.innerText || '';
                        const labelStart = selectedText.indexOf(labelText.trim());
                        
                        if (labelStart !== -1) {
                            itemsToRemove.push(item);
                        }
                    }
                });
                    
                    if (itemsToRemove.length > 0) {
                        const allAreNumbers = itemsToRemove.every(item => item.classList.contains('number-item'));
                        
                        if (allAreNumbers) {
                            itemsToRemove.forEach(item => {
                                this.removeNumber(item, element);
                            });
                            return;
                        }
                        
                        let insertPosition = itemsToRemove[0];
                        const existingNumbersBefore = Array.from(element.querySelectorAll('.number-item'))
                            .filter(item => item.compareDocumentPosition(insertPosition) & Node.DOCUMENT_POSITION_FOLLOWING);
                        const startNumber = existingNumbersBefore.length + 1;
                        
                        itemsToRemove.forEach((item, index) => {
                            const parent = item.parentNode;
                            const labelSpan = item.querySelector('span:last-child');
                            const lineText = labelSpan ? (labelSpan.innerHTML || '').trim() : '';
                            
                            const div = document.createElement('div');
                            div.className = 'number-item';
                            
                            const number = document.createElement('span');
                            number.className = 'number-point';
                            number.textContent = `${startNumber + index}.`;
                            number.setAttribute('contenteditable', 'false');
                            
                            const label = document.createElement('span');
                            label.innerHTML = lineText;
                            
                            div.appendChild(number);
                            div.appendChild(label);
                            
                            parent.replaceChild(div, item);
                        });
                        
                        this.renumberList(element);
                    } else {
                        selectedText = selectedText.replace(/^•\s*/gm, '').replace(/^\d+\.\s*/gm, '').trim();
                        range.deleteContents();
                        
                        const lines = selectedText.split('\n').filter(line => line.trim());
                        const fragment = document.createDocumentFragment();
                        
                        const existingNumbers = element.querySelectorAll('.number-item').length;
                        const startNumber = existingNumbers + 1;
                        
                        lines.forEach((line, index) => {
                            const div = document.createElement('div');
                            div.className = 'number-item';
                            
                            const number = document.createElement('span');
                            number.className = 'number-point';
                            number.textContent = `${startNumber + index}.`;
                            number.setAttribute('contenteditable', 'false');
                            
                            const label = document.createElement('span');
                            label.textContent = line.trim();
                            
                            div.appendChild(number);
                            div.appendChild(label);
                            fragment.appendChild(div);
                        });
                        
                        range.insertNode(fragment);
                        this.renumberList(element);
                    }
                    
                    selection.removeAllRanges();
                }
                                
                addNumbers(element) {
                    const originalHTML = element.innerHTML.trim();
                    
                    if (!originalHTML || originalHTML === '<br>') {
                        const div = document.createElement('div');
                        div.className = 'number-item';
                        
                        const number = document.createElement('span');
                        number.className = 'number-point';
                        number.textContent = '1.';
                        number.setAttribute('contenteditable', 'false');
                        
                        const label = document.createElement('span');
                        label.innerHTML = '<br>';
                        
                        div.appendChild(number);
                        div.appendChild(label);
                        element.appendChild(div);
                        
                        setTimeout(() => {
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.setStart(label, 0);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }, 10);
                        return;
                    }
                    
                    const lines = originalHTML.split('<br>').filter(line => line.trim());
                    
                    if (lines.length === 0) {
                        lines.push(originalHTML);
                    }
                    
                    element.innerHTML = '';
                    
                    lines.forEach((lineHTML, index) => {
                        const div = document.createElement('div');
                        div.className = 'number-item';
                        
                        const number = document.createElement('span');
                        number.className = 'number-point';
                        number.textContent = `${index + 1}.`;
                        number.setAttribute('contenteditable', 'false');
                        
                        const label = document.createElement('span');
                        label.innerHTML = lineHTML.trim();
                        
                        div.appendChild(number);
                        div.appendChild(label);
                        element.appendChild(div);
                    });
                }
                                
                setupNumberEnterKey(element, containerId) {
                    element.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const selection = window.getSelection();
                            const range = selection.getRangeAt(0);
                            const container = range.commonAncestorContainer;
                            
                            let numberItem = container.nodeType === 3 ? container.parentNode : container;
                            while (numberItem && !numberItem.classList.contains('number-item')) {
                                numberItem = numberItem.parentNode;
                            }
                            
                            if (numberItem && numberItem.classList.contains('number-item')) {
                                e.preventDefault();
                                
                                const label = numberItem.querySelector('span:last-child');
                                const textContent = label.textContent.trim();
                                
                                if (!textContent || textContent === '') {
                                    const br = document.createElement('br');
                                    numberItem.parentNode.insertBefore(br, numberItem.nextSibling);
                                    numberItem.remove();
                                    
                                    this.renumberList(element);
                                    
                                    const newRange = document.createRange();
                                    newRange.setStartAfter(br);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                    return;
                                }
                                
                                if (e.shiftKey) {
                                    document.execCommand('insertHTML', false, '<br>');
                                } else {
                                    const textAfterCursor = this.getTextAfterCursor(range, label);
                                    
                                    if (textAfterCursor) {
                                        this.removeTextAfterCursor(range, label);
                                    }
                                    
                                    const newDiv = document.createElement('div');
                                    newDiv.className = 'number-item';
                                    
                                    const number = document.createElement('span');
                                    number.className = 'number-point';
                                    number.textContent = '1.';
                                    number.setAttribute('contenteditable', 'false');
                                    
                                    const newLabel = document.createElement('span');
                                    newLabel.innerHTML = textAfterCursor || '<br>';
                                    
                                    newDiv.appendChild(number);
                                    newDiv.appendChild(newLabel);
                                    
                                    numberItem.parentNode.insertBefore(newDiv, numberItem.nextSibling);
                                    
                                    this.renumberList(element);
                                    
                                    const newRange = document.createRange();
                                    newRange.setStart(newLabel, 0);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                }
                            }
                        } else if (e.key === 'Backspace') {
                            const selection = window.getSelection();
                            const range = selection.getRangeAt(0);
                            const container = range.commonAncestorContainer;
                            
                            let numberItem = container.nodeType === 3 ? container.parentNode : container;
                            while (numberItem && !numberItem.classList.contains('number-item')) {
                                numberItem = numberItem.parentNode;
                            }
                            
                            if (numberItem && numberItem.classList.contains('number-item')) {
                                const label = numberItem.querySelector('span:last-child');
                                
                                if (range.startOffset === 0 && range.endOffset === 0) {
                                    const textContent = label.textContent.trim();
                                    
                                    if (!textContent || textContent === '') {
                                        e.preventDefault();
                                        const br = document.createElement('br');
                                        numberItem.parentNode.insertBefore(br, numberItem);
                                        numberItem.remove();
                                        
                                        this.renumberList(element);
                                        
                                        const newRange = document.createRange();
                                        newRange.setStartAfter(br);
                                        newRange.collapse(true);
                                        selection.removeAllRanges();
                                        selection.addRange(newRange);
                                    }
                                }
                            }
                        }
                    });
                }
                
                preventNumberFormatting(element) {
                    element.addEventListener('input', (e) => {
                        const numbers = element.querySelectorAll('.number-point');
                        numbers.forEach(number => {
                            number.style.fontWeight = 'normal';
                            number.style.textDecoration = 'none';
                            number.style.fontStyle = 'normal';
                            number.style.backgroundColor = 'transparent';
                            
                            if (number.parentElement) {
                                const computedColor = window.getComputedStyle(number.parentElement.querySelector('span:last-child')).color;
                                number.style.color = computedColor;
                            }
                        });
                    });
                }
            addCheckboxToSelection(element, selection) {
                const range = selection.getRangeAt(0);
                let selectedText = selection.toString().trim();
                
                if (!selectedText) return;
                
                const startContainer = range.startContainer;
                const endContainer = range.endContainer;
                
                let startNode = startContainer.nodeType === 3 ? startContainer.parentNode : startContainer;
                if (startNode.classList && (startNode.classList.contains('bullet-point') || startNode.classList.contains('number-point'))) {
                    return;
                }
                
                let endNode = endContainer.nodeType === 3 ? endContainer.parentNode : endContainer;
                if (endNode.classList && (endNode.classList.contains('bullet-point') || endNode.classList.contains('number-point'))) {
                    return;
                }
                
                const itemsToRemove = [];
                const allItems = element.querySelectorAll('.checkbox-item, .bullet-item, .number-item');
                
            allItems.forEach(item => {
                const label = item.querySelector('span:last-child');
                if (label) {
                    const labelText = label.textContent || label.innerText || '';
                    const labelStart = selectedText.indexOf(labelText.trim());
                    
                    if (labelStart !== -1) {
                        itemsToRemove.push(item);
                    }
                }
            });
                
                if (itemsToRemove.length > 0) {
                    const allAreCheckboxes = itemsToRemove.every(item => item.classList.contains('checkbox-item'));
                    
                    if (allAreCheckboxes) {
                        itemsToRemove.forEach(item => {
                            this.removeCheckbox(item, element);
                        });
                        return;
                    }
                    
                    const wasNumberList = itemsToRemove.some(item => item.classList.contains('number-item'));
                    
                    itemsToRemove.forEach((item) => {
                        const parent = item.parentNode;
                        const labelSpan = item.querySelector('span:last-child');
                        const lineText = labelSpan ? (labelSpan.innerHTML || '').trim() : '';
                        
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
                        label.innerHTML = lineText;
                        
                        div.appendChild(checkbox);
                        div.appendChild(label);
                        
                        parent.replaceChild(div, item);
                    });
                    
                    if (wasNumberList) {
                        this.renumberList(element);
                    }
                } else {
                    selectedText = selectedText.replace(/^•\s*/gm, '').replace(/^\d+\.\s*/gm, '').trim();
                    range.deleteContents();
                    
                    const lines = selectedText.split('\n').filter(line => line.trim());
                    const fragment = document.createDocumentFragment();
                    
                    lines.forEach((line) => {
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
                        label.textContent = line.trim();
                        
                        div.appendChild(checkbox);
                        div.appendChild(label);
                        fragment.appendChild(div);
                    });
                    
                    range.insertNode(fragment);
                }
                
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
                            const label = checkboxItem.querySelector('span');
                            const textAfterCursor = this.getTextAfterCursor(range, label);
                            
                            if (textAfterCursor) {
                                this.removeTextAfterCursor(range, label);
                            }
                            
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
                            
                            const newLabel = document.createElement('span');
                            newLabel.innerHTML = textAfterCursor || '<br>';
                            
                            newDiv.appendChild(checkbox);
                            newDiv.appendChild(newLabel);
                            
                            checkboxItem.parentNode.insertBefore(newDiv, checkboxItem.nextSibling);
                            
                            const newRange = document.createRange();
                            newRange.setStart(newLabel, 0);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    }
                }
            });
        }
        
        getTextAfterCursor(range, label) {
            const clonedRange = range.cloneRange();
            clonedRange.selectNodeContents(label);
            clonedRange.setStart(range.endContainer, range.endOffset);
            
            const fragment = clonedRange.cloneContents();
            const div = document.createElement('div');
            div.appendChild(fragment);
            return div.innerHTML;
        }
        
        removeTextAfterCursor(range, label) {
            const clonedRange = range.cloneRange();
            clonedRange.selectNodeContents(label);
            clonedRange.setStart(range.endContainer, range.endOffset);
            clonedRange.deleteContents();
        }
            render() {
                const wrapper = document.getElementById('containersWrapper');
                const overlay = document.getElementById('overlay');
                wrapper.innerHTML = '';
                
                const hasExpanded = this.containers.some(c => c.expanded);
                overlay.classList.toggle('show', hasExpanded);
                
                const visibleContainers = this.containers.filter(c => 
                    (c.parentId || null) === this.currentFolderId
                );
                
                visibleContainers.forEach((container, index) => {
                    const div = document.createElement('div');
                    const isSelected = this.selectedContainer === container.id;
                    const isFolder = container.type === 'folder';
                    
                    div.className = `container ${isFolder ? 'folder' : ''} ${container.expanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`;
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
                    
                    title.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        clearTimeout(this.pressTimer); 
                    });
                    
                    title.addEventListener('mouseup', (e) => {
                        e.stopPropagation();
                    });
                    
                    title.addEventListener('focus', (e) => {
                        e.stopPropagation();
                    });
                    
                    if (isFolder && !container.expanded) {
                        const folderIcon = document.createElement('img');
                        folderIcon.src = 'img/folder.png';
                        folderIcon.className = 'folder-icon';
                        
                        const timestamp = document.createElement('div');
                        timestamp.className = 'container-timestamp';
                        const lastModified = this.getLastModifiedInFolder(container.id);
                        timestamp.textContent = this.formatDate(lastModified || container.lastModified);
                        
                        div.appendChild(title);
                        div.appendChild(folderIcon);
                        div.appendChild(timestamp);
                        
                        div.addEventListener('mousedown', (e) => {
                            if (e.target === title || title.contains(e.target)) {
                                return; 
                            }
                            this.handlePressStart(container.id, e);
                        });
                        
                        div.addEventListener('mouseup', (e) => {
                            if (e.target === title || title.contains(e.target)) {
                                return; 
                            }
                            this.handlePressEnd(container.id, e);
                        });
                        
                        div.addEventListener('mouseleave', () => {
                            clearTimeout(this.pressTimer);
                        });
                        
                        div.addEventListener('touchstart', (e) => {
                            if (e.target === title || title.contains(e.target)) {
                                return;
                            }
                            this.handlePressStart(container.id, e);
                        });
                        
                        div.addEventListener('touchend', (e) => {
                            if (e.target === title || title.contains(e.target)) {
                                return;
                            }
                            this.handlePressEnd(container.id, e);
                        });
                        
                    } else {
                        const content = document.createElement('div');
                        content.className = 'container-content';
                        content.contentEditable = container.expanded;
                        content.innerHTML = container.content || '';
                        
                        this.attachCheckboxListeners(content, container.id);
                        
                        if (container.expanded) {
                            this.setupCheckboxEnterKey(content, container.id);
                            this.setupBulletEnterKey(content, container.id);
                            this.preventBulletFormatting(content);
                            this.setupNumberEnterKey(content, container.id);
                            this.preventNumberFormatting(content);
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
                            const charCount = this.getCharCount(container.content || '');
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
                        
                        if (container.expanded) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'container';
                            placeholder.style.pointerEvents = 'none';
                            
                            const placeholderTitle = document.createElement('div');
                            placeholderTitle.className = 'container-title';
                            placeholderTitle.textContent = container.title;
                            
                            const placeholderContent = document.createElement('div');
                            placeholderContent.className = 'container-content';
                            placeholderContent.innerHTML = container.content || '';
                            
                            const placeholderTimestamp = document.createElement('div');
                            placeholderTimestamp.className = 'container-timestamp';
                            placeholderTimestamp.textContent = this.formatDate(container.lastModified);
                            
                            placeholder.appendChild(placeholderTitle);
                            placeholder.appendChild(placeholderContent);
                            placeholder.appendChild(placeholderTimestamp);
                            
                            wrapper.appendChild(placeholder);
                        }
                    }
                    
                    wrapper.appendChild(div);
                });
                
                this.updateBreadcrumb();
            }            
            updateEmptyState() {
                const emptyState = document.querySelector('.empty-state');
                const visibleContainers = this.containers.filter(c => 
                    (c.parentId || null) === this.currentFolderId
                );
                emptyState.classList.toggle('hidden', visibleContainers.length > 0);
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
                        if (!c.hasOwnProperty('type')) {
                            c.type = 'container'; 
                        }
                        if (!c.hasOwnProperty('parentId')) {
                            c.parentId = null; 
                        }
                    });
                }
            }
        }

    const app = new TodoApp();