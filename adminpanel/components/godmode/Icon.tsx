'use client';

import React from 'react';

interface IconProps {
	icon: string | React.ComponentType<React.SVGProps<SVGSVGElement>>;
	className?: string;
	size?: number;
	style?: React.CSSProperties;
}

export function Icon({ icon, className = '', size = 20, style }: IconProps) {
	if (typeof icon === 'string') {
		if (icon.startsWith('<svg') || icon.startsWith('data:image/svg')) {
			return (
				<span
					className={`icon-wrapper ${className}`}
					style={{
						width: size,
						height: size,
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
					dangerouslySetInnerHTML={{ __html: icon }}
				/>
			);
		}
		return (
			<span
				className={`icon-wrapper ${className}`}
				style={{
					width: size,
					height: size,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<img src={icon} alt="" style={{ width: size, height: size }} />
			</span>
		);
	}

	const IconComponent = icon;
	const iconStyle: React.CSSProperties = {
		width: size,
		height: size,
		fill: (style?.color as string | undefined) || 'currentColor',
		color: (style?.color as string | undefined) || 'currentColor',
		...(style || {}),
	};
	return (
		<span
			className={`icon-wrapper ${className}`}
			style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
		>
			<IconComponent style={iconStyle} className={className} />
		</span>
	);
}
