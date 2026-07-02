import { createSVG } from './svg_utils';

export default class Arrow {
    constructor(gantt, from_task, to_task) {
        this.gantt = gantt;
        this.from_task = from_task;
        this.to_task = to_task;

        this.calculate_path();
        this.draw();
    }

    calculate_path() {
        let start_x =
            this.from_task.$bar.getX() + this.from_task.$bar.getWidth() / 2;

        const condition = () =>
            this.to_task.$bar.getX() < start_x + this.gantt.options.padding &&
            start_x > this.from_task.$bar.getX() + this.gantt.options.padding;

        while (condition()) {
            start_x -= 10;
        }
        start_x -= 10;

        let start_y =
            this.gantt.config.header_height +
            this.gantt.options.bar_height +
            (this.gantt.options.padding + this.gantt.options.bar_height) *
                this.from_task.task._index +
            this.gantt.options.padding / 2;

        let end_x = this.to_task.$bar.getX() - 13;
        let end_y =
            this.gantt.config.header_height +
            this.gantt.options.bar_height / 2 +
            (this.gantt.options.padding + this.gantt.options.bar_height) *
                this.to_task.task._index +
            this.gantt.options.padding / 2;

        const from_is_below_to =
            this.from_task.task._index > this.to_task.task._index;

        let curve = this.gantt.options.arrow_curve;
        const clockwise = from_is_below_to ? 1 : 0;
        let curve_y = from_is_below_to ? -curve : curve;

        if (
            this.to_task.$bar.getX() <=
            this.from_task.$bar.getX() + this.gantt.options.padding
        ) {
            let down_1 = this.gantt.options.padding / 2 - curve;
            if (down_1 < 0) {
                down_1 = 0;
                curve = this.gantt.options.padding / 2;
                curve_y = from_is_below_to ? -curve : curve;
            }
            const down_2 =
                this.to_task.$bar.getY() +
                this.to_task.$bar.getHeight() / 2 -
                curve_y;
            const left = this.to_task.$bar.getX() - this.gantt.options.padding;
            this.path = `
                M ${start_x} ${start_y}
                v ${down_1}
                a ${curve} ${curve} 0 0 1 ${-curve} ${curve}
                H ${left}
                a ${curve} ${curve} 0 0 ${clockwise} ${-curve} ${curve_y}
                V ${down_2}
                a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                L ${end_x} ${end_y}
                m -5 -5
                l 5 5
                l -5 5`;
        } else {
            if (end_x < start_x + curve) curve = end_x - start_x;

            let offset = from_is_below_to ? end_y + curve : end_y - curve;

            this.path = `
              M ${start_x} ${start_y}
              V ${offset}
              a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve}
              L ${end_x} ${end_y}
              m -5 -5
              l 5 5
              l -5 5`;
        }

        // Store midpoint for delete button placement
        this._mid_x = (start_x + end_x) / 2;
        this._mid_y = (start_y + end_y) / 2;
        this._start_x = start_x;
        this._start_y = start_y;
        this._end_x = end_x;
        this._end_y = end_y;
    }

    draw() {
        this.element = createSVG('path', {
            d: this.path,
            'data-from': this.from_task.task.id,
            'data-to': this.to_task.task.id,
        });
    }

    setup_delete_button(layer) {
        if (this.gantt.options.hide_dep_delete) return;
        const mid_x = this._mid_x;
        const mid_y = this._mid_y;
        const from_id = this.from_task.task.id;
        const to_id = this.to_task.task.id;

        // Wide invisible hit area on the path
        this.$hit_area = createSVG('path', {
            d: this.path,
            'data-from': from_id,
            'data-to': to_id,
        });
        this.$hit_area.setAttribute('stroke', 'transparent');
        this.$hit_area.setAttribute('stroke-width', '14');
        this.$hit_area.setAttribute('fill', 'none');
        this.$hit_area.style.pointerEvents = 'visibleStroke';
        this.$hit_area.style.cursor = 'pointer';
        layer.appendChild(this.$hit_area);

        // Delete button group
        this.$del_group = createSVG('g', {
            class: 'dep-del-group',
        });
        this.$del_group.style.opacity = '0';
        this.$del_group.style.transition = 'opacity 0.12s';

        const bg = createSVG('circle', {
            cx: mid_x,
            cy: mid_y,
            r: 9,
            fill: '#1a1b1e',
            stroke: 'rgba(255,80,80,0.65)',
            'stroke-width': '1.5',
            append_to: this.$del_group,
        });

        const txt = createSVG('text', {
            x: mid_x,
            y: mid_y,
            innerHTML: '×',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            fill: 'rgba(255,80,80,0.9)',
            'font-size': '13',
            'font-weight': '600',
            'pointer-events': 'none',
            append_to: this.$del_group,
        });
        txt.style.userSelect = 'none';

        layer.appendChild(this.$del_group);

        const showDel = () => {
            this.$del_group.style.opacity = '1';
            this.element.style.stroke = 'rgba(255,80,80,0.55)';
        };
        const hideDel = () => {
            this.$del_group.style.opacity = '0';
            this.element.style.stroke = '';
        };

        this.$hit_area.addEventListener('mouseenter', showDel);
        this.$hit_area.addEventListener('mouseleave', hideDel);
        this.$del_group.addEventListener('mouseenter', showDel);
        this.$del_group.addEventListener('mouseleave', hideDel);

        this.$del_group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.gantt.trigger_event('dep_delete', [from_id, to_id]);
        });
    }

    update() {
        this.calculate_path();
        this.element.setAttribute('d', this.path);
        if (this.$hit_area) this.$hit_area.setAttribute('d', this.path);
        if (this.$del_group) {
            const bg = this.$del_group.querySelector('circle');
            const txt = this.$del_group.querySelector('text');
            if (bg) { bg.setAttribute('cx', this._mid_x); bg.setAttribute('cy', this._mid_y); }
            if (txt) { txt.setAttribute('x', this._mid_x); txt.setAttribute('y', this._mid_y); }
        }
    }
}
