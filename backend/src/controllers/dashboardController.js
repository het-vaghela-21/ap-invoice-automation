import * as analyticsService from '../services/analyticsService.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const data = await analyticsService.getSummaryData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceStatusAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getInvoiceStatusData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getVendorAnalyticsData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getExceptionAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getExceptionAnalyticsData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getPOAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getPOAnalyticsData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req, res, next) => {
  try {
    const data = await analyticsService.getRecentActivityData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getReadyForPayment = async (req, res, next) => {
  try {
    const data = await analyticsService.getReadyForPaymentData();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};
