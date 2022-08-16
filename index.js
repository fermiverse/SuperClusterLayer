import { CompositeLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import SuperCluster from 'supercluster';
import NodeLayer from '../nodelayer/index';

function getTextSize(d) {
    const { cluster, point_count } = d.properties ?? {};
    if (!cluster) return 0;
    const m = Math.ceil(Math.log10(point_count));
    return 20 * Math.sqrt(m);
}

function getCircleRadius(d) {
    return 0.8 * getTextSize(d);
}

export default class SuperClusterLayer extends CompositeLayer {
    shouldUpdateState({ changeFlags }) {
        return changeFlags.somethingChanged;
    }

    updateState({ props, oldProps, changeFlags }) {
        const rebuildIndex = changeFlags.dataChanged || props.sizeScale !== oldProps.sizeScale;
        const { maxZoom, radius } = this.props;

        if (rebuildIndex) {
            const index = new SuperCluster({ maxZoom, radius });
            index.load(
                props.data.map((d) => ({
                    geometry: {
                        coordinates: props.getPosition(d)
                    },
                    properties: d
                }))
            );
            this.setState({ index });
        }

        const z = Math.floor(this.context.viewport.zoom);
        if (rebuildIndex || z !== this.state.z) {
            this.setState({
                data: this.state.index.getClusters([-180, -85, 180, 85], z),
                z
            });
        }
    }

    getPickingInfo({ info, mode }) {
        const pickedObject = info.object && info.object.properties;
        if (pickedObject) {
            if (pickedObject.cluster && mode !== 'hover') {
                info.objects = this.state.index
                    .getLeaves(pickedObject.cluster_id)
                    .map(f => f.properties);

                info.clusterExpansionZoom = this.state.index
                    .getClusterExpansionZoom(pickedObject.cluster_id);
            }
            info.object = pickedObject;
        }
        return info;
    }

    renderLayers() {
        const { data } = this.state;
        const { 
            id, 
            iconAtlas, 
            iconMapping, 
            sizeScale, 
            getIcon,
            getIconSize,

            getTextSize,
            getTextAngle,
            getTextAnchor,
            getTextAlignmentBaseline,
            getTextColor,

            getCircleRadius,
            getCircleFillColor,

            getPosition, 
            pickable, 
             
        } = this.props;
        
        return [
            new IconLayer({
                id: `${id}__icon`,
                data,
                pickable,
                iconAtlas,
                iconMapping,
                sizeScale,
                getPosition,
                getSize: getIconSize,
                getIcon: d => d.properties.cluster && d.properties.point_count > 1 ? null : getIcon(d.properties)
            }),
            new NodeLayer({
                id: `${id}__node`,
                data,
                pickable,
                getPosition,
                getText: d => d.properties.cluster ? `${d.properties.point_count}` : null,
                getTextSize,
                getTextAngle,
                getTextAnchor,
                getTextAlignmentBaseline,
                getTextColor,

                getCircleRadius,
                getCircleFillColor,
            }),
        ];
    }
}

SuperClusterLayer.defaultProps = {
    id: 'superclusterlayer',
    data: [],
    
    //cluster props
    maxZoom: 10,
    radius: 40,

    // icon props
    ...IconLayer.defaultProps,
    iconAtlas: '', 
    iconMapping: {}, 
    sizeScale: 1, 
    getIcon: d => d.icon,
    getIconSize: 32,

    // node props
    getTextSize,
    getTextAngle: 0,
    getTextAnchor: 'middle',
    getTextAlignmentBaseline: 'center',
    getTextColor: [255, 255, 255, 250],

    getCircleRadius,
    getCircleFillColor: [54, 164, 255, 250],

    getPosition: d => d.geometry.coordinates, 
    pickable: true, 
}