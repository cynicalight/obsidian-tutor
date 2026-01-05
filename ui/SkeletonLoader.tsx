import * as React from 'react';

export const SkeletonLoader: React.FC = () => {
    return (
        <div className="skeleton-loader">
            <div className="skeleton-line" style={{ width: '100%' }}></div>
            <div className="skeleton-line" style={{ width: '90%' }}></div>
            <div className="skeleton-line" style={{ width: '95%' }}></div>
        </div>
    );
};
